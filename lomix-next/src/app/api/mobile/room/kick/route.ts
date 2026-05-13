import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole, canKick } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/kick:
 *   post:
 *     summary: Kullanıcıyı odadan at (Sahip veya Admin)
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
 *                 description: Odadan atılacak kullanıcının ID'si
 *     responses:
 *       200:
 *         description: Kullanıcı odadan atıldı
 *       403:
 *         description: Yetkisiz
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const actorId = await getCurrentUserId(request);
        if (!actorId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId, userId } = await request.json();
        if (!roomId || !userId) return ApiResponseHelper.error("roomId ve userId zorunludur.", 400);

        const targetId = Number(userId);
        const where = isNaN(Number(roomId)) ? { roomId: String(roomId) } : { id: Number(roomId) };
        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        if (targetId === room.ownerId) {
            return ApiResponseHelper.error("Oda sahibi odadan atılamaz.", 400);
        }

        const actorRole = await getRoomRole(room.id, actorId, room.ownerId);
        if (!canKick(actorRole)) {
            return ApiResponseHelper.error("Kullanıcı atmak için yetkiniz yok.", 403);
        }

        // Admin başka admini atamaz, sadece sahip atabilir
        const targetRole = await getRoomRole(room.id, targetId, room.ownerId);
        if (targetRole === 'admin' && actorRole !== 'owner') {
            return ApiResponseHelper.error("Admin kullanıcıları sadece oda sahibi atabilir.", 403);
        }

        await prisma.roomParticipant.deleteMany({
            where: { roomId: room.id, userId: targetId },
        });

        // Mic slotundan da çıkar
        await prisma.roomMicSlot.updateMany({
            where: { roomId: room.id, userId: targetId },
            data: { userId: null },
        });

        logRoomEvent(room.id, actorId, 'KICKED', targetId);

        return ApiResponseHelper.success({
            userId: String(targetId),
            rtm_event: { type: 'KICKED', targetUserId: String(targetId) },
        }, "Kullanıcı odadan atıldı.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
