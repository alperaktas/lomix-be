import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole, canManageMic } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/mic/mute:
 *   post:
 *     summary: Mikrofonu sessize al veya aç (Sahip veya Admin)
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, slotIndex, action]
 *             properties:
 *               roomId:
 *                 type: string
 *               slotIndex:
 *                 type: integer
 *                 description: Mic slot numarası (0'dan başlar)
 *               action:
 *                 type: string
 *                 enum: [mute, unmute]
 *     responses:
 *       200:
 *         description: Mic durumu güncellendi
 *       403:
 *         description: Yetkisiz
 */
export async function POST(request: Request) {
    try {
        const actorId = await getCurrentUserId(request);
        if (!actorId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId, slotIndex, action } = await request.json();
        if (!roomId || slotIndex === undefined || !action) {
            return ApiResponseHelper.error("roomId, slotIndex ve action zorunludur.", 400);
        }

        if (!['mute', 'unmute'].includes(action)) {
            return ApiResponseHelper.error("action 'mute' veya 'unmute' olmalıdır.", 400);
        }

        const where = isNaN(Number(roomId)) ? { roomId: String(roomId) } : { id: Number(roomId) };
        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        const actorRole = await getRoomRole(room.id, actorId, room.ownerId);
        if (!canManageMic(actorRole)) {
            return ApiResponseHelper.error("Mikrofon yönetimi için yetkiniz yok.", 403);
        }

        const slot = await prisma.roomMicSlot.findUnique({
            where: { roomId_slotIndex: { roomId: room.id, slotIndex: Number(slotIndex) } },
        });
        if (!slot) return ApiResponseHelper.error("Mic slot bulunamadı.", 404);

        await prisma.roomMicSlot.update({
            where: { id: slot.id },
            data: { isMuted: action === 'mute' },
        });

        const isMuted = action === 'mute';
        logRoomEvent(room.id, actorId, 'MIC_MUTED', null, `slot:${slotIndex} action:${action}`);
        const message = isMuted ? "Mikrofon sessize alındı." : "Mikrofon açıldı.";
        return ApiResponseHelper.success({
            slotIndex: Number(slotIndex),
            isMuted,
            rtm_event: { type: 'MIC_MUTED', slotIndex: Number(slotIndex), isMuted },
        }, message);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
