import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole, canUpdateTopic } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/desc:
 *   post:
 *     summary: Oda açıklamasını güncelle
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, description]
 *             properties:
 *               roomId:
 *                 type: string
 *                 description: Oda ID (room_XXXXXX veya sayısal)
 *               description:
 *                 type: string
 *                 description: Yeni açıklama metni
 *     responses:
 *       200:
 *         description: Açıklama güncellendi
 *       403:
 *         description: Yetkisiz (sadece oda sahibi güncelleyebilir)
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const body = await request.json();
        const { roomId, description } = body;

        if (!roomId || description === undefined) {
            return ApiResponseHelper.error("roomId ve description zorunludur.", 400);
        }

        const where = isNaN(Number(roomId))
            ? { roomId: String(roomId) }
            : { id: Number(roomId) };

        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        const role = await getRoomRole(room.id, userId, room.ownerId);
        if (!canUpdateTopic(role)) {
            return ApiResponseHelper.error("Oda konusunu sadece oda sahibi veya adminler güncelleyebilir.", 403);
        }

        const updated = await prisma.room.update({
            where: { id: room.id },
            data: { description: String(description) },
            select: { roomId: true, name: true, description: true },
        });

        logRoomEvent(room.id, userId, 'DESC_UPDATED');

        return ApiResponseHelper.success({
            room_id: updated.roomId,
            name: updated.name,
            description: updated.description,
            rtm_event: { type: 'SETTINGS_UPDATED', description: updated.description },
        }, "Oda açıklaması güncellendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
