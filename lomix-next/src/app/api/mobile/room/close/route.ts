import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { sendAdminSignalEvent } from '@/lib/agora';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/close:
 *   post:
 *     summary: Odayı kapat (Sadece Owner)
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
 *         description: Oda kapatıldı
 *       403:
 *         description: Sadece oda sahibi kapatabilir
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId } = await request.json();
        if (!roomId) return ApiResponseHelper.error("roomId zorunludur.", 400);

        const numericId = Number(roomId);
        const where = { OR: [{ roomId: String(roomId) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] };

        const room = await prisma.room.findFirst({ where, select: { id: true, roomId: true, ownerId: true, isLive: true } });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        if (room.ownerId !== userId) return ApiResponseHelper.error("Sadece oda sahibi odayı kapatabilir.", 403);

        if (!room.isLive) return ApiResponseHelper.error("Oda zaten kapalı.", 400);

        await prisma.room.update({
            where: { id: room.id },
            data: { isLive: false, isClosed: true },
        });

        await sendAdminSignalEvent(room.roomId, { type: 'ROOM_CLOSED' });

        logRoomEvent(room.id, userId, 'ROOM_CLOSED');

        return ApiResponseHelper.success(null, "Oda kapatıldı.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
