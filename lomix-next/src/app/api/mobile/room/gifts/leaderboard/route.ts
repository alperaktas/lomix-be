import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

function getPeriodStart(period: string): Date | null {
    const now = new Date();
    switch (period) {
        case 'daily':
            return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case 'monthly':
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case 'all_time':
            return null;
        case 'weekly':
        default:
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
}

/**
 * @swagger
 * /api/mobile/room/gifts/leaderboard:
 *   post:
 *     summary: Oda Hediye Sıralaması
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [roomId, period]
 *             properties:
 *               roomId:
 *                 type: string
 *               period:
 *                 type: string
 *                 enum: [daily, weekly, monthly, all_time]
 *     responses:
 *       200:
 *         description: Hediye sıralaması başarıyla getirildi
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const formData = await request.formData();
        const roomId = formData.get('roomId') as string | null;
        const period = formData.get('period') as string | null;

        if (!roomId) return ApiResponseHelper.error("roomId zorunludur.", 400);
        if (!period) return ApiResponseHelper.error("period zorunludur.", 400);

        const numericId = Number(roomId);
        const room = await prisma.room.findFirst({
            where: { OR: [{ roomId: String(roomId) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] },
        });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        const since = getPeriodStart(period);
        const dateFilter = since ? { createdAt: { gte: since } } : {};

        const grouped = await prisma.giftLog.groupBy({
            by: ['senderId'],
            where: { roomId: room.id, ...dateFilter },
            _sum: { totalPrice: true },
            orderBy: { _sum: { totalPrice: 'desc' } },
            take: 50,
        });

        const userIds = grouped.map(g => g.senderId);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true, username: true, avatar: true },
        });
        const userMap = new Map(users.map(u => [u.id, u]));

        const entries = grouped.map((g, index) => {
            const u = userMap.get(g.senderId);
            const score = g._sum.totalPrice ?? 0;
            return {
                rank: index + 1,
                name: u?.fullName || u?.username || '',
                id: String(g.senderId),
                score: String(score),
                avatar: u?.avatar || `https://i.pravatar.cc/150?u=${g.senderId}`,
            };
        });

        return ApiResponseHelper.success({
            type: 'gifts',
            period,
            top_three: entries.slice(0, 3),
            others: entries.slice(3),
        }, "Hediye sıralaması başarıyla getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
