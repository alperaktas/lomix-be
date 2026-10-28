import prisma from '@/lib/prisma';
import { membershipEarnings } from '@/lib/agency';

/**
 * Ajans primi: ajansın yayıncılarının dönem cirosu (elmas) üzerinden kademeli oranla hesaplanır ve
 * ajans sahibinin hesabına ek elmas olarak yazılır (yayıncıdan düşülmez). Dönem (günlük/haftalık/aylık)
 * ajans başına admin tarafından seçilir; dönemler Türkiye saatine göre (UTC+3, yaz saati yok) kesilir,
 * hafta Pazartesi-Pazar'dır. Prim, dönem kapandıktan sonraki ilk çalışmada ödenir.
 */

export type PrimPeriod = 'daily' | 'weekly' | 'monthly';
export const PRIM_PERIODS: PrimPeriod[] = ['daily', 'weekly', 'monthly'];

const HOUR = 3600 * 1000;
const TR_OFFSET = 3 * HOUR;
/** Bir çalışmada bir ajans için en fazla bu kadar dönem kapatılır (uzun kesintiden sonra yetişmek için). */
const MAX_CHUNKS_PER_RUN = 400;

export type Tier = { fromDiamonds: number; ratePercent: number };

/** Ürün sahibinin tablosu (ciro elmas): 0-5M %20, 5-20M %23, 20-50M %26, 50-100M %29, 100-200M %32, 200M+ %35. */
export const DEFAULT_TIERS: Tier[] = [
    { fromDiamonds: 0, ratePercent: 20 },
    { fromDiamonds: 5_000_000, ratePercent: 23 },
    { fromDiamonds: 20_000_000, ratePercent: 26 },
    { fromDiamonds: 50_000_000, ratePercent: 29 },
    { fromDiamonds: 100_000_000, ratePercent: 32 },
    { fromDiamonds: 200_000_000, ratePercent: 35 },
];

// ---------- Türkiye saatine göre dönem sınırları ----------

const toTr = (d: Date) => new Date(d.getTime() + TR_OFFSET);
const fromTr = (d: Date) => new Date(d.getTime() - TR_OFFSET);

/** `at` anını içeren dönemin başlangıcı (Türkiye saatiyle gece yarısı). */
export function periodStart(period: PrimPeriod, at: Date): Date {
    const t = toTr(at);
    const y = t.getUTCFullYear(), m = t.getUTCMonth(), day = t.getUTCDate();
    if (period === 'daily') return fromTr(new Date(Date.UTC(y, m, day)));
    if (period === 'weekly') {
        const sinceMonday = (t.getUTCDay() + 6) % 7;
        return fromTr(new Date(Date.UTC(y, m, day - sinceMonday)));
    }
    return fromTr(new Date(Date.UTC(y, m, 1)));
}

/** Aynı dönem türünde bir sonraki dönemin başlangıcı. `start` hizalı bir dönem başı olmalı. */
export function nextPeriodStart(period: PrimPeriod, start: Date): Date {
    if (period === 'daily') return new Date(start.getTime() + 24 * HOUR);
    if (period === 'weekly') return new Date(start.getTime() + 7 * 24 * HOUR);
    const t = toTr(start);
    return fromTr(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1)));
}

/** İmleçten başlayan dönemin kapanışı: imleç dönem ortasındaysa (ilk dönem) kısa bir ilk dönem olur. */
export function chunkEnd(period: PrimPeriod, cursor: Date): Date {
    return nextPeriodStart(period, periodStart(period, cursor));
}

/** Prim ilk açıldığında sayım, ertesi Türkiye gününün başından başlar. */
export function nextTrMidnight(at: Date): Date {
    return nextPeriodStart('daily', periodStart('daily', at));
}

// ---------- kademe ----------

/**
 * Cironun düştüğü kademenin oranı (alt sınır dahil: tam 5M, 5-20M kademesindedir) tüm ciroya uygulanır.
 * Tutar aşağı yuvarlanır (elmas tam sayıdır).
 */
export function primFor(turnover: number, tiers: Tier[]): { ratePercent: number; amount: number } {
    const sorted = [...tiers].sort((a, b) => a.fromDiamonds - b.fromDiamonds);
    let ratePercent = sorted[0]?.ratePercent ?? 0;
    for (const t of sorted) if (turnover >= t.fromDiamonds) ratePercent = t.ratePercent;
    return { ratePercent, amount: Math.floor((Math.max(0, turnover) * ratePercent) / 100) };
}

/** Kayıtlı kademeler; hiç kayıt yoksa varsayılan tablo. */
export async function loadTiers(): Promise<Tier[]> {
    const rows = await prisma.agencyPrimTier.findMany({ orderBy: { fromDiamonds: 'asc' } });
    return rows.length > 0 ? rows.map(r => ({ fromDiamonds: r.fromDiamonds, ratePercent: r.ratePercent })) : DEFAULT_TIERS;
}

// ---------- ciro ve ödeme ----------

/** Ajansın [from, to) penceresindeki cirosu: o pencerede üye olan yayıncıların kazancı. */
export async function agencyTurnover(agencyId: number, from: Date, to: Date): Promise<number> {
    const rows = await membershipEarnings({ agencyIds: [agencyId], from, to });
    return rows.reduce((sum, r) => sum + r.diamonds, 0);
}

export type SettleResult = { agencyId: number; chunks: number; paid: number };

/**
 * Ajansın kapanmış dönemlerini öder. Çift ödeme olmaz: (ajans, dönem başı) benzersizdir ve imleç
 * (`primPaidThrough`) ödeme ile aynı transaction'da, beklenen değere koşullu ilerletilir; eşzamanlı iki
 * çalışmadan biri geri alınır. İmleç dönem türü değişse de kayıpsız ilerler (ödenmemiş süre yeni türe
 * göre dilimlenir).
 */
export async function settleAgency(agencyId: number, now: Date = new Date(), tiers?: Tier[]): Promise<SettleResult> {
    const result: SettleResult = { agencyId, chunks: 0, paid: 0 };
    const tierList = tiers ?? await loadTiers();

    for (let i = 0; i < MAX_CHUNKS_PER_RUN; i++) {
        const agency = await prisma.agency.findUnique({
            where: { id: agencyId },
            select: { ownerId: true, primPeriod: true, primPaidThrough: true },
        });
        if (!agency?.primPeriod || !agency.primPaidThrough) break;
        if (!PRIM_PERIODS.includes(agency.primPeriod as PrimPeriod)) break;

        const period = agency.primPeriod as PrimPeriod;
        const start = agency.primPaidThrough;
        const end = chunkEnd(period, start);
        if (end.getTime() > now.getTime()) break; // dönem henüz kapanmadı

        const turnover = await agencyTurnover(agencyId, start, end);
        const { ratePercent, amount } = primFor(turnover, tierList);

        try {
            await prisma.$transaction(async tx => {
                const moved = await tx.agency.updateMany({
                    where: { id: agencyId, primPaidThrough: start },
                    data: { primPaidThrough: end },
                });
                if (moved.count !== 1) throw new Error('RACE');

                await tx.agencyPrimPayout.create({
                    data: { agencyId, ownerId: agency.ownerId, period, periodStart: start, periodEnd: end, turnover, ratePercent, amount },
                });
                if (amount > 0) {
                    await tx.wallet.upsert({
                        where: { userId: agency.ownerId },
                        update: { diamonds: { increment: amount } },
                        create: { userId: agency.ownerId, balance: 0, diamonds: amount },
                    });
                    await tx.diamondTransaction.create({
                        data: { userId: agency.ownerId, type: 'agency_prim', diamondAmount: amount },
                    });
                }
            });
        } catch (e: any) {
            // Başka bir çalışma bu dönemi az önce ödedi: bu çalışma durur, çift ödeme olmaz.
            if (e?.message === 'RACE' || e?.code === 'P2002') break;
            throw e;
        }

        result.chunks++;
        result.paid += amount;
    }
    return result;
}

/** Primi açık tüm ajansların kapanmış dönemlerini öder (zamanlanmış iş ve admin düğmesi bunu çağırır). */
export async function settleAll(now: Date = new Date()): Promise<{ agencies: number; chunks: number; paid: number }> {
    const [agencies, tiers] = await Promise.all([
        prisma.agency.findMany({ where: { primPeriod: { not: null } }, select: { id: true } }),
        loadTiers(),
    ]);
    const total = { agencies: agencies.length, chunks: 0, paid: 0 };
    for (const a of agencies) {
        const r = await settleAgency(a.id, now, tiers);
        total.chunks += r.chunks;
        total.paid += r.paid;
    }
    return total;
}
