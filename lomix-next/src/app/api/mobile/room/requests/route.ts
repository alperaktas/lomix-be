import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/room/requests:
 *   post:
 *     summary: Bekleyen mikrofon taleplerini listele (sadece oda sahibi)
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId]
 *             properties:
 *               roomId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Talepler listelendi
 *       403:
 *         description: Yetkisiz
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId } = await request.json();
        if (!roomId) return ApiResponseHelper.error("roomId zorunludur.", 400);

        const where = isNaN(Number(roomId))
            ? { roomId: String(roomId) }
            : { id: Number(roomId) };

        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        if (room.ownerId !== userId) {
            return ApiResponseHelper.error("Bu işlem için yetkiniz yok.", 403);
        }

        const requests = await prisma.roomMicRequest.findMany({
            where: { roomId: room.id, status: "pending" },
            include: {
                user: {
                    select: { id: true, fullName: true, username: true, avatar: true, level: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return ApiResponseHelper.success({
            roomId: String(roomId),
            requests: requests.map(r => ({
                id: String(r.id),
                userId: String(r.userId),
                name: r.user.fullName || r.user.username,
                level: `Lvl ${r.user.level}`,
                avatarUrl: r.user.avatar || "https://i.pravatar.cc/50",
                createdAt: r.createdAt,
            })),
        }, "Üyelik istekleri getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
