import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUserId } from '@/lib/current-user';

type Period = 'daily' | 'weekly' | 'monthly' | 'all';

/** İstemcilerin gönderebildiği yazımlar. Tanınmayan değer eskiden sessizce haftalığa düşüyordu ("Tüm zamanlar" haftalık çıkıyordu). */
const PERIOD_ALIASES: Record<string, Period> = {
    daily: 'daily', day: 'daily', today: 'daily', gunluk: 'daily', 'günlük': 'daily',
    weekly: 'weekly', week: 'weekly', haftalik: 'weekly', 'haftalık': 'weekly',
    monthly: 'monthly', month: 'monthly', aylik: 'monthly', 'aylık': 'monthly',
    all: 'all', all_time: 'all', alltime: 'all', 'all-time': 'all', lifetime: 'all', total: 'all',
    tum_zamanlar: 'all', tumzamanlar: 'all', 'tüm_zamanlar': 'all', 'tümzamanlar': 'all',
};

function normalizePeriod(raw: string): Period | null {
    return PERIOD_ALIASES[raw.trim().toLowerCase().replace(/\s+/g, '_')] ?? null;
}

/** Son 24 saat / 7 gün / 30 gün (kayan pencere); `all` için sınır yok. */
function getPeriodStart(period: Period): Date | null {
    const now = new Date();
    switch (period) {
        case 'daily':
            return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case 'monthly':
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case 'all':
            return null;
        case 'weekly':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
}

function formatScore(score: number): string {
    if (score >= 1000000) return (score / 1000000).toFixed(1) + 'm';
    if (score >= 1000) return (score / 1000).toFixed(1) + 'k';
    return String(score);
}

/**
 * @swagger
 * /api/mobile/leaderboard:
 *   get:
 *     summary: Sıralama listesi (yayıncılar, destekçiler, odalar)
 *     description: |
 *       `type`: `anchor` (en çok elmas kazanan yayıncılar, varsayılan), `supporter` (en çok coin harcayan destekçiler),
 *       `rooms` (en çok hediye alan odalar). `period`: `daily` (son 24 saat), `weekly` (son 7 gün, varsayılan),
 *       `monthly` (son 30 gün), `all` (tüm zamanlar, tarih sınırı yok). `all` için `all_time`, `alltime`, `total` da kabul edilir.
 *       Tanınmayan `period` 400 döner. Cevaptaki `period` normalleştirilmiş değerdir, `since` pencerenin başlangıcıdır
 *       (`all` için null). Puan: yayıncı = tüm elmas kazançları (hediyeler, oda hediyeleri, mesaj kazancı; bonus/görev kazançları HARİÇ),
 *       destekçi ve oda = hediyeye harcanan coin.
 *     tags: [Mobile Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [anchor, supporter, rooms] }
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [daily, weekly, monthly, all] }
 *     responses:
 *       200:
 *         description: data.type, data.period, data.since, data.top_three, data.others
 *       400:
 *         description: Geçersiz period
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'anchor';
        const period = normalizePeriod(searchParams.get('period') || 'weekly');
        if (!period) {
            return NextResponse.json({ status: false, message: "period daily, weekly, monthly veya all olmalıdır." }, { status: 400 });
        }
        const since = getPeriodStart(period);
        const dateFilter = since ? { createdAt: { gte: since } } : {};

        let formattedEntries: any[];

        if (type === 'rooms') {
            // En çok hediye geliri alan odalar
            const grouped = await prisma.giftLog.groupBy({
                by: ['roomId'],
                where: { roomId: { not: null }, ...dateFilter },
                _sum: { totalPrice: true },
                orderBy: { _sum: { totalPrice: 'desc' } },
                take: 18,
            });

            const roomIds = grouped.map(g => g.roomId).filter((id): id is number => id !== null);
            const rooms = await prisma.room.findMany({
                where: { id: { in: roomIds } },
                select: {
                    id: true, roomId: true, name: true, viewerCount: true, type: true, thumbnailUrl: true,
                    owner: { select: { fullName: true, username: true, avatar: true } },
                },
            });
            const roomMap = new Map(rooms.map(r => [r.id, r]));

            formattedEntries = grouped.map((g, index) => {
                const room = roomMap.get(g.roomId as number);
                const score = g._sum.totalPrice ?? 0;
                return {
                    rank: index + 1,
                    room_id: room?.roomId ?? null,
                    room_name: room?.name ?? '',
                    owner_name: room?.owner?.fullName || room?.owner?.username || '',
                    owner_avatar: room?.owner?.avatar || `https://i.pravatar.cc/150?u=${room?.roomId ?? g.roomId}`,
                    score: formatScore(score),
                    viewer_count: room?.viewerCount ?? 0,
                    type: room?.type ?? 'voice',
                    thumbnail_url: room?.thumbnailUrl || null,
                };
            });
        } else if (type === 'supporter') {
            // En çok hediye gönderen (coin harcayan) kullanıcılar
            const grouped = await prisma.giftLog.groupBy({
                by: ['senderId'],
                where: dateFilter,
                _sum: { totalPrice: true },
                orderBy: { _sum: { totalPrice: 'desc' } },
                take: 18,
            });

            const userIds = grouped.map(g => g.senderId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, fullName: true, username: true, avatar: true },
            });
            const userMap = new Map(users.map(u => [u.id, u]));

            formattedEntries = grouped.map((g, index) => {
                const u = userMap.get(g.senderId);
                const score = g._sum.totalPrice ?? 0;
                return {
                    rank: index + 1,
                    room_id: null,
                    room_name: null,
                    owner_name: u?.fullName || u?.username || '',
                    owner_avatar: u?.avatar || `https://i.pravatar.cc/150?u=${g.senderId}`,
                    score: formatScore(score),
                    viewer_count: score,
                    type: null,
                    thumbnail_url: null,
                    user_id: String(g.senderId),
                };
            });
        } else {
            // anchor: tüm elmas kazançları (hediye + oda hediyesi + mesaj kazancı). Bonus/görev kazançları dahil değildir.
            // Alıcısız eski oda hediyeleri oda sahibine yazılır; yeni oda hediyelerinde alıcı kayıtlıdır.
            const sinceSql = since ? Prisma.sql`AND created_at >= ${since.toISOString()}::timestamp` : Prisma.empty;
            const rows = await prisma.$queryRaw<{ user_id: number; diamonds: number }[]>(Prisma.sql`
                SELECT user_id, SUM(diamonds)::float8 AS diamonds FROM (
                    SELECT receiver_id AS user_id, diamond_amount AS diamonds FROM gift_logs
                        WHERE receiver_id IS NOT NULL ${sinceSql}
                    UNION ALL
                    SELECT r.owner_id AS user_id, g.diamond_amount AS diamonds FROM gift_logs g
                        JOIN rooms r ON r.id = g.room_id
                        WHERE g.receiver_id IS NULL ${since ? Prisma.sql`AND g.created_at >= ${since.toISOString()}::timestamp` : Prisma.empty}
                    UNION ALL
                    SELECT user_id, diamond_amount AS diamonds FROM diamond_transactions
                        WHERE type = 'message_earning' ${sinceSql}
                ) e
                GROUP BY user_id
                HAVING SUM(diamonds) > 0
                ORDER BY SUM(diamonds) DESC, user_id ASC
                LIMIT 18
            `);
            const grouped = rows.map(r => ({ receiverId: Number(r.user_id), _sum: { diamondAmount: Math.round(Number(r.diamonds)) } }));

            const userIds = grouped.map(g => g.receiverId).filter((id): id is number => id !== null);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, fullName: true, username: true, avatar: true },
            });
            const userMap = new Map(users.map(u => [u.id, u]));

            formattedEntries = grouped.map((g, index) => {
                const u = userMap.get(g.receiverId as number);
                const score = g._sum.diamondAmount ?? 0;
                return {
                    rank: index + 1,
                    room_id: null,
                    room_name: null,
                    owner_name: u?.fullName || u?.username || '',
                    owner_avatar: u?.avatar || `https://i.pravatar.cc/150?u=${g.receiverId}`,
                    score: formatScore(score),
                    viewer_count: score,
                    type: null,
                    thumbnail_url: null,
                    user_id: String(g.receiverId),
                };
            });
        }

        return NextResponse.json({
            status: true,
            message: "Leaderboard fetched successfully",
            data: {
                type,
                period,
                since: since ? since.toISOString() : null,
                top_three: formattedEntries.slice(0, 3),
                others: formattedEntries.slice(3),
            },
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
