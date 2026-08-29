import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

function getPeriodStart(period: string): Date | null {
    const now = new Date();
    switch (period) {
        case 'daily':
            return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case 'monthly':
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case 'all':
            return null;
        case 'weekly':
        default:
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
}

function formatScore(score: number): string {
    if (score >= 1000000) return (score / 1000000).toFixed(1) + 'm';
    if (score >= 1000) return (score / 1000).toFixed(1) + 'k';
    return String(score);
}

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'anchor';
        const period = searchParams.get('period') || 'weekly';
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
            // anchor: en çok hediye alan (elmas kazanan) yayıncılar
            const grouped = await prisma.giftLog.groupBy({
                by: ['receiverId'],
                where: { receiverId: { not: null }, ...dateFilter },
                _sum: { diamondAmount: true },
                orderBy: { _sum: { diamondAmount: 'desc' } },
                take: 18,
            });

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
                top_three: formattedEntries.slice(0, 3),
                others: formattedEntries.slice(3),
            },
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
