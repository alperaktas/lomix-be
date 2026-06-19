import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole, canRemoveMember } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/member/remove:
 *   post:
 *     summary: Oda üyesini çıkar (Sahip veya Admin)
 *     description: |
 *       Sahip: admin ve üyeleri çıkarabilir.
 *       Admin: sadece üyeleri (member) çıkarabilir.
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, userId]
 *             properties:
 *               roomId:
 *                 type: string
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Üye çıkarıldı
 *       403:
 *         description: Yetkisiz
 */
export async function POST(request: Request) {
    try {
        const actorId = await getCurrentUserId(request);
        if (!actorId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId, userId } = await request.json();
        if (!roomId || !userId) return ApiResponseHelper.error("roomId ve userId zorunludur.", 400);

        const targetId = Number(userId);
        const numericId = Number(roomId);
        const where = { OR: [{ roomId: String(roomId) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] };
        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        if (targetId === room.ownerId) {
            return ApiResponseHelper.error("Oda sahibi üyelikten çıkarılamaz.", 400);
        }

        const actorRole = await getRoomRole(room.id, actorId, room.ownerId);
        const targetRole = await getRoomRole(room.id, targetId, room.ownerId);

        if (!canRemoveMember(actorRole, targetRole)) {
            return ApiResponseHelper.error("Bu kullanıcıyı üyelikten çıkarma yetkiniz yok.", 403);
        }

        await prisma.roomMember.deleteMany({
            where: { roomId: room.id, userId: targetId },
        });

        logRoomEvent(room.id, actorId, 'MEMBER_REMOVED', targetId);

        return ApiResponseHelper.success({
            userId: String(targetId),
            rtm_event: { type: 'MEMBER_REMOVED', userId: String(targetId) },
        }, "Üye çıkarıldı.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
