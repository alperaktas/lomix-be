import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole, canManageMic } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/mic/lock:
 *   post:
 *     summary: Mikrofon slotunu kilitle veya kilidi aç (Sahip veya Admin)
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
 *               action:
 *                 type: string
 *                 enum: [lock, unlock]
 *     responses:
 *       200:
 *         description: Slot durumu güncellendi
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

        if (!['lock', 'unlock'].includes(action)) {
            return ApiResponseHelper.error("action 'lock' veya 'unlock' olmalıdır.", 400);
        }

        const numericId = Number(roomId);
        const where = { OR: [{ roomId: String(roomId) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] };
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

        const isLocking = action === 'lock';
        await prisma.roomMicSlot.update({
            where: { id: slot.id },
            data: {
                isLocked: isLocking,
                userId: isLocking ? null : undefined, // kilitlenince kullanıcıyı serbest bırak
            },
        });

        const freedUserId = isLocking && slot.userId ? String(slot.userId) : null;
        logRoomEvent(room.id, actorId, 'MIC_LOCKED', null, `slot:${slotIndex} action:${action}`);
        const message = isLocking ? "Mikrofon slotu kilitlendi." : "Mikrofon slotu kilidi açıldı.";
        return ApiResponseHelper.success({
            slotIndex: Number(slotIndex),
            isLocked: isLocking,
            freedUserId,
            rtm_event: { type: 'MIC_LOCKED', slotIndex: Number(slotIndex), isLocked: isLocking, freedUserId },
        }, message);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
