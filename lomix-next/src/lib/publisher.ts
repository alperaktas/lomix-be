import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { ROLE_STREAMER } from '@/lib/roles';

/** Türkiye saati UTC+3 sabit (yaz saati uygulaması yok). Gün/hafta/ay sınırları buna göre hesaplanır. */
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

export type StatsWindows = { daily: Date; weekly: Date; monthly: Date };

/**
 * Takvim bazlı dönem başlangıçları (Türkiye saatiyle): bugün 00:00, bu haftanın pazartesisi 00:00, bu ayın 1'i 00:00.
 * Dönen tarihler gerçek (UTC) an'dır.
 */
export function statsWindows(now: Date = new Date()): StatsWindows {
    const tr = new Date(now.getTime() + TR_OFFSET_MS); // UTC alanları Türkiye duvar saatini gösterir
    const y = tr.getUTCFullYear(), m = tr.getUTCMonth(), d = tr.getUTCDate();
    const dayStartTr = Date.UTC(y, m, d);
    const weekday = (tr.getUTCDay() + 6) % 7; // pazartesi = 0
    return {
        daily: new Date(dayStartTr - TR_OFFSET_MS),
        weekly: new Date(dayStartTr - weekday * 86_400_000 - TR_OFFSET_MS),
        monthly: new Date(Date.UTC(y, m, 1) - TR_OFFSET_MS),
    };
}

/**
 * Kullanıcının `since`'den bu yana kazandığı elmas (uygulama içi): kendisine gelen hediyeler, kendi odasına gelen
 * alıcısız eski oda hediyeleri ve mesaj kazancı. Bonus/görev kazançları dahil değildir (yayıncı sıralamasıyla aynı kural).
 */
export async function inAppEarningsSince(userId: number, since: Date): Promise<number> {
    const iso = since.toISOString();
    const rows = await prisma.$queryRaw<{ diamonds: number }[]>(Prisma.sql`
        SELECT (
            COALESCE((SELECT SUM(g.diamond_amount) FROM gift_logs g
                WHERE g.receiver_id = ${userId} AND g.created_at >= ${iso}::timestamp), 0)
          + COALESCE((SELECT SUM(g.diamond_amount) FROM gift_logs g JOIN rooms r ON r.id = g.room_id
                WHERE g.receiver_id IS NULL AND r.owner_id = ${userId} AND g.created_at >= ${iso}::timestamp), 0)
          + COALESCE((SELECT SUM(t.diamond_amount) FROM diamond_transactions t
                WHERE t.user_id = ${userId} AND t.type = 'message_earning' AND t.created_at >= ${iso}::timestamp), 0)
        )::float8 AS diamonds
    `);
    return Math.round(Number(rows[0]?.diamonds ?? 0));
}

/** Yayıncı mı: onaylı yayıncı (ajans onayıyla) ya da rolü yayıncı olan kullanıcı. */
export function isStreamer(user: { isBroadcaster: boolean; role: string }): boolean {
    return user.isBroadcaster || user.role === ROLE_STREAMER;
}
