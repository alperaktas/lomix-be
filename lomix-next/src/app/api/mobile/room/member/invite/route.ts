import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole, canInvite } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/member/invite:
 *   post:
 *     summary: Odaya üye davet et (Sahip veya Admin)
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
 *                 description: Davet edilecek kullanıcının ID'si
 *     responses:
 *       200:
 *         description: Davet gönderildi
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
        if (!roomId || !userId) {
            return ApiResponseHelper.error("roomId ve userId zorunludur.", 400);
        }

        const targetId = Number(userId);
        const numericId = Number(roomId);
        const where = { OR: [{ roomId: String(roomId) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] };
        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        const actorRole = await getRoomRole(room.id, actorId, room.ownerId);
        if (!canInvite(actorRole)) {
            return ApiResponseHelper.error("Bu işlem için yetkiniz yok.", 403);
        }

        if (targetId === room.ownerId) {
            return ApiResponseHelper.error("Oda sahibi zaten üyedir.", 400);
        }

        // Zaten üye mi?
        const existing = await prisma.roomMember.findUnique({
            where: { roomId_userId: { roomId: room.id, userId: targetId } },
        });
        if (existing) return ApiResponseHelper.error("Bu kullanıcı zaten oda üyesidir.", 400);

        // Bekleyen davet var mı?
        const existingInvite = await prisma.roomMemberInvite.findUnique({
            where: { roomId_userId: { roomId: room.id, userId: targetId } },
        });

        if (existingInvite) {
            if (existingInvite.status === 'pending') {
                return ApiResponseHelper.error("Bu kullanıcıya zaten davet gönderilmiş.", 400);
            }
            // Reddedilmişse yeniden gönder
            await prisma.roomMemberInvite.update({
                where: { id: existingInvite.id },
                data: { status: 'pending', invitedBy: actorId },
            });
        } else {
            await prisma.roomMemberInvite.create({
                data: { roomId: room.id, userId: targetId, invitedBy: actorId },
            });
        }

        logRoomEvent(room.id, actorId, 'MEMBER_INVITED', targetId);

        return ApiResponseHelper.success({
            userId: String(targetId),
            rtm_event: { type: 'MEMBER_INVITED', invitedUserId: String(targetId), invitedBy: String(actorId) },
        }, "Davet gönderildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
