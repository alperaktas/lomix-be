import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/member/set-admin:
 *   post:
 *     summary: Üyeyi admin yap veya admin'i üyeliğe düşür (Sadece Sahip)
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
 *                 enum: [promote, demote]
 *     responses:
 *       200:
 *         description: Rol güncellendi
 *       403:
 *         description: Sadece oda sahibi yapabilir
 */
export async function POST(request: Request) {
    try {
        const actorId = await getCurrentUserId(request);
        if (!actorId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId, userId, action } = await request.json();
        if (!roomId || !userId || !action) {
            return ApiResponseHelper.error("roomId, userId ve action zorunludur.", 400);
        }

        if (!['promote', 'demote'].includes(action)) {
            return ApiResponseHelper.error("action 'promote' veya 'demote' olmalıdır.", 400);
        }

        const targetId = Number(userId);
        const where = isNaN(Number(roomId)) ? { roomId: String(roomId) } : { id: Number(roomId) };
        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        if (actorId !== room.ownerId) {
            return ApiResponseHelper.error("Sadece oda sahibi admin atayabilir veya kaldırabilir.", 403);
        }

        if (targetId === room.ownerId) {
            return ApiResponseHelper.error("Oda sahibinin rolü değiştirilemez.", 400);
        }

        const actorRole = await getRoomRole(room.id, targetId, room.ownerId);

        if (action === 'promote') {
            if (actorRole === 'visitor') {
                return ApiResponseHelper.error("Kullanıcı önce oda üyesi olmalıdır.", 400);
            }
            await prisma.roomMember.update({
                where: { roomId_userId: { roomId: room.id, userId: targetId } },
                data: { role: 'admin' },
            });
            logRoomEvent(room.id, actorId, 'ROLE_PROMOTED', targetId);
            return ApiResponseHelper.success({
                userId: String(targetId),
                role: 'admin',
                rtm_event: { type: 'ROLE_UPDATED', userId: String(targetId), role: 'admin' },
            }, "Kullanıcı admin yapıldı.");
        } else {
            if (actorRole !== 'admin') {
                return ApiResponseHelper.error("Bu kullanıcı zaten admin değil.", 400);
            }
            await prisma.roomMember.update({
                where: { roomId_userId: { roomId: room.id, userId: targetId } },
                data: { role: 'member' },
            });
            logRoomEvent(room.id, actorId, 'ROLE_DEMOTED', targetId);
            return ApiResponseHelper.success({
                userId: String(targetId),
                role: 'member',
                rtm_event: { type: 'ROLE_UPDATED', userId: String(targetId), role: 'member' },
            }, "Admin yetkisi kaldırıldı.");
        }
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
