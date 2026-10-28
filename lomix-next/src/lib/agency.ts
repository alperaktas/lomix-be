import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

type Tx = Prisma.TransactionClient;

/**
 * Yayıncıyı ajansa onaylı üye olarak ekler ve üyelik geçmişinde yeni bir dönem açar.
 * AgencyMember "şu anki" durumu, AgencyMembership ise geçmişi (giriş/çıkış tarihi) tutar;
 * kazanç bu dönemlere göre hesaplandığı için ikisi her zaman aynı transaction'da yazılır.
 */
export async function joinAgency(tx: Tx, agencyId: number, userId: number, when: Date = new Date()) {
    await tx.agencyMember.upsert({
        where: { userId },
        create: { agencyId, userId, status: 'approved' },
        update: { agencyId, status: 'approved' },
    });
    await tx.agencyMembership.create({ data: { agencyId, userId, joinedAt: when } });
}

/** Açık üyelik dönemini kapatır (ajanstan çıkış ya da transfer). */
export async function closeOpenMembership(tx: Tx, userId: number, when: Date = new Date()) {
    await tx.agencyMembership.updateMany({
        where: { userId, leftAt: null },
        data: { leftAt: when },
    });
}

/** Yayıncıyı ajanstan çıkarır; geçmiş dönem ve kazanç kaydı korunur. */
export async function leaveAgency(tx: Tx, userId: number, when: Date = new Date()) {
    await closeOpenMembership(tx, userId, when);
    await tx.agencyMember.deleteMany({ where: { userId } });
}

/** Yayıncıyı başka ajansa aktarır: eski ajanstaki dönem kapanır, yenisinde yeni dönem açılır. */
export async function transferMember(tx: Tx, userId: number, toAgencyId: number, when: Date = new Date()) {
    await closeOpenMembership(tx, userId, when);
    await tx.agencyMember.update({ where: { userId }, data: { agencyId: toAgencyId, status: 'approved' } });
    await tx.agencyMembership.create({ data: { agencyId: toAgencyId, userId, joinedAt: when } });
}

export type MembershipEarning = { membershipId: number; diamonds: number };

/**
 * Üyelik dönemi başına kazanılan elmas. Yalnızca o ajansta bulunulan dönemde (giriş <= zaman < çıkış)
 * kazanılanlar sayılır; böylece yayıncı transfer olunca eski kazanç eski ajansta kalır.
 * Kaynaklar: kullanıcıya gelen hediyeler, kendi odasına gelen hediyeler (oda hediyesinde alıcı kaydı
 * yoktur, elmas oda sahibine yazılır) ve mesaj kazancı.
 * `from` / `to` verilirse sayım ayrıca [from, to) penceresiyle sınırlanır (prim dönemleri için).
 */
export async function membershipEarnings(
    where: { agencyIds?: number[]; userIds?: number[]; from?: Date; to?: Date },
): Promise<MembershipEarning[]> {
    const conds: Prisma.Sql[] = [];
    if (where.agencyIds) conds.push(Prisma.sql`m.agency_id = ANY(${where.agencyIds}::int[])`);
    if (where.userIds) conds.push(Prisma.sql`m.user_id = ANY(${where.userIds}::int[])`);
    if (conds.length === 0) return [];

    // ISO metni ::timestamp'e çevrilince saat dilimi eki yok sayılır, değer UTC olarak kalır (sütunlar UTC).
    const lower = where.from
        ? Prisma.sql`GREATEST(m.joined_at, ${where.from.toISOString()}::timestamp)`
        : Prisma.sql`m.joined_at`;
    const upper = where.to
        ? Prisma.sql`LEAST(COALESCE(m.left_at, 'infinity'::timestamp), ${where.to.toISOString()}::timestamp)`
        : Prisma.sql`COALESCE(m.left_at, 'infinity'::timestamp)`;

    const rows = await prisma.$queryRaw<{ membership_id: number; diamonds: number }[]>(Prisma.sql`
        SELECT m.id AS membership_id,
            (
                COALESCE((SELECT SUM(g.diamond_amount) FROM gift_logs g
                    WHERE g.receiver_id = m.user_id
                      AND g.created_at >= ${lower} AND g.created_at < ${upper}), 0)
              + COALESCE((SELECT SUM(g.diamond_amount) FROM gift_logs g JOIN rooms r ON r.id = g.room_id
                    WHERE g.receiver_id IS NULL AND r.owner_id = m.user_id
                      AND g.created_at >= ${lower} AND g.created_at < ${upper}), 0)
              + COALESCE((SELECT SUM(t.diamond_amount) FROM diamond_transactions t
                    WHERE t.user_id = m.user_id AND t.type = 'message_earning'
                      AND t.created_at >= ${lower} AND t.created_at < ${upper}), 0)
            )::float8 AS diamonds
        FROM agency_memberships m
        WHERE ${Prisma.join(conds, ' AND ')}
    `);

    return rows.map(r => ({ membershipId: Number(r.membership_id), diamonds: Math.round(Number(r.diamonds)) }));
}

const PHONE_CLEAN = /[\s\-().]/g;

/** Telefonu "+905312983233" biçimine indirger; biçim geçersizse null. */
export function normalizePhone(raw: string): string | null {
    const cleaned = raw.trim().replace(PHONE_CLEAN, '');
    if (!/^\+?\d+$/.test(cleaned)) return null;
    const digits = cleaned.replace('+', '');
    return digits.length >= 10 && digits.length <= 15 ? cleaned : null;
}
