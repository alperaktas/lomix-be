import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole, canKick } from '@/lib/room-permissions';

/**
 * @swagger
 * /api/mobile/room/blocked-users:
 *   post:
 *     summary: Odadan banlanmış kullanıcıları listele (Sahip veya Admin)
 *     description: |
 *       Ban kayıtları, oda ayarında `block_kick_settings` açıkken yapılan
 *       `room/kick` işlemlerinden oluşur.
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, action]
 *             properties:
 *               roomId:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [list]
 *     responses:
 *       200:
 *         description: Banlı kullanıcılar başarıyla getirildi
 *       403:
 *         description: Yetkisiz
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const actorId = await getCurrentUserId(request);
        if (!actorId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId, action } = await request.json();
        if (!roomId) return ApiResponseHelper.error("roomId zorunludur.", 400);
        if (action !== 'list') return ApiResponseHelper.error("Desteklenmeyen action.", 400);

        const numericId = Number(roomId);
        const room = await prisma.room.findFirst({
            where: { OR: [{ roomId: String(roomId) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] },
        });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        const actorRole = await getRoomRole(room.id, actorId, room.ownerId);
        if (!canKick(actorRole)) {
            return ApiResponseHelper.error("Banlı kullanıcıları görüntülemek için yetkiniz yok.", 403);
        }

        const bans = await prisma.roomBan.findMany({
            where: { roomId: room.id },
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, username: true, avatar: true, gender: true, level: true, isVip: true } },
            },
        });

        const users = bans.map(b => ({
            userId: String(b.userId),
            username: b.user.username,
            avatarUrl: b.user.avatar || `https://i.pravatar.cc/50?u=${b.userId}`,
            gender: b.user.gender ?? null,
            level: b.user.level,
            isVip: b.user.isVip,
        }));

        return ApiResponseHelper.success({ users }, "Banlı kullanıcılar başarıyla getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
