import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole, canKick } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/block-user:
 *   post:
 *     summary: Kullanıcıyı odadan banla / banını kaldır (Sahip veya Admin)
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, userId, action]
 *             properties:
 *               roomId:
 *                 type: string
 *               userId:
 *                 type: integer
 *               action:
 *                 type: string
 *                 enum: [block, unblock]
 *     responses:
 *       200:
 *         description: Ban durumu güncellendi
 *       403:
 *         description: Yetkisiz
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const actorId = await getCurrentUserId(request);
        if (!actorId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId, userId, action } = await request.json();
        if (!roomId || !userId || !action) {
            return ApiResponseHelper.error("roomId, userId ve action zorunludur.", 400);
        }
        if (!['block', 'unblock'].includes(action)) {
            return ApiResponseHelper.error("action 'block' veya 'unblock' olmalıdır.", 400);
        }

        const targetId = Number(userId);
        const numericId = Number(roomId);
        const where = { OR: [{ roomId: String(roomId) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] };
        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        if (targetId === room.ownerId) {
            return ApiResponseHelper.error("Oda sahibi banlanamaz.", 400);
        }

        const actorRole = await getRoomRole(room.id, actorId, room.ownerId);
        if (!canKick(actorRole)) {
            return ApiResponseHelper.error("Kullanıcı banlamak için yetkiniz yok.", 403);
        }

        const targetUser = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
        if (!targetUser) return ApiResponseHelper.error("Kullanıcı bulunamadı.", 404);

        if (action === 'block') {
            // Admin başka admini banlayamaz, sadece sahip banlayabilir
            const targetRole = await getRoomRole(room.id, targetId, room.ownerId);
            if (targetRole === 'admin' && actorRole !== 'owner') {
                return ApiResponseHelper.error("Admin kullanıcıları sadece oda sahibi banlayabilir.", 403);
            }

            await prisma.roomBan.upsert({
                where: { roomId_userId: { roomId: room.id, userId: targetId } },
                create: { roomId: room.id, userId: targetId, bannedBy: actorId },
                update: { bannedBy: actorId, createdAt: new Date() },
            });

            // Odadan da çıkar
            await prisma.roomParticipant.deleteMany({ where: { roomId: room.id, userId: targetId } });
            await prisma.roomMicSlot.updateMany({ where: { roomId: room.id, userId: targetId }, data: { userId: null } });

            logRoomEvent(room.id, actorId, 'USER_BLOCKED', targetId);

            return ApiResponseHelper.success({
                userId: String(targetId),
                isBlocked: true,
                rtm_event: { type: 'ROOM_USER_BLOCKED', targetUserId: String(targetId) },
            }, "Kullanıcı odadan banlandı.");
        }

        const existing = await prisma.roomBan.findUnique({
            where: { roomId_userId: { roomId: room.id, userId: targetId } },
        });
        if (!existing) {
            return ApiResponseHelper.success({
                userId: String(targetId),
                isBlocked: false,
                rtm_event: { type: 'ROOM_USER_UNBLOCKED', targetUserId: String(targetId) },
            }, "Kullanıcı zaten banlı değildi.");
        }

        await prisma.roomBan.delete({ where: { roomId_userId: { roomId: room.id, userId: targetId } } });
        logRoomEvent(room.id, actorId, 'USER_UNBLOCKED', targetId);

        return ApiResponseHelper.success({
            userId: String(targetId),
            isBlocked: false,
            rtm_event: { type: 'ROOM_USER_UNBLOCKED', targetUserId: String(targetId) },
        }, "Kullanıcının banı kaldırıldı.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
