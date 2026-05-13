import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/mic/leave:
 *   post:
 *     summary: Mic slotundan ayrıl (odadan çıkmadan)
 *     description: Kullanıcı, odada kalmaya devam ederken mikrofon slotunu bırakır.
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
 *         description: Mic bırakıldı
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId } = await request.json();
        if (!roomId) return ApiResponseHelper.error("roomId zorunludur.", 400);

        const where = isNaN(Number(roomId)) ? { roomId: String(roomId) } : { id: Number(roomId) };
        const room = await prisma.room.findFirst({ where, select: { id: true } });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        // Önce hangi slotta olduğunu öğren
        const slot = await prisma.roomMicSlot.findFirst({
            where: { roomId: room.id, userId },
            select: { id: true, slotIndex: true },
        });

        if (!slot) return ApiResponseHelper.error("Aktif mic slotunuz bulunmuyor.", 400);

        await prisma.roomMicSlot.update({
            where: { id: slot.id },
            data: { userId: null, isMuted: false },
        });

        logRoomEvent(room.id, userId, 'MIC_LEFT', null, String(slot.slotIndex));

        return ApiResponseHelper.success({
            slotIndex: slot.slotIndex,
            rtm_event: { type: 'MIC_LEFT', slotIndex: slot.slotIndex, userId: String(userId) },
        }, "Mic bırakıldı.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
