import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole, canKick } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/lock:
 *   post:
 *     summary: Odayı kilitle / kilidi kaldır (Sahip veya Admin)
 *     description: |
 *       `password` 6 haneli rakam gönderilirse oda kilitlenir. `password` boş
 *       gönderilirse odanın kilidi kaldırılır.
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
 *               password:
 *                 type: string
 *                 description: 6 haneli rakam. Boş bırakılırsa kilit kaldırılır.
 *     responses:
 *       200:
 *         description: Kilit durumu güncellendi
 *       400:
 *         description: Şifre 6 haneli rakam olmalı
 *       403:
 *         description: Yetkisiz
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const actorId = await getCurrentUserId(request);
        if (!actorId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId, password } = await request.json();
        if (!roomId) return ApiResponseHelper.error("roomId zorunludur.", 400);

        const numericId = Number(roomId);
        const where = { OR: [{ roomId: String(roomId) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] };
        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        const actorRole = await getRoomRole(room.id, actorId, room.ownerId);
        if (!canKick(actorRole)) {
            return ApiResponseHelper.error("Odayı kilitlemek için yetkiniz yok.", 403);
        }

        const trimmedPassword = typeof password === 'string' ? password.trim() : '';

        if (!trimmedPassword) {
            await prisma.room.update({ where: { id: room.id }, data: { isLocked: false, password: null } });
            logRoomEvent(room.id, actorId, 'ROOM_UNLOCKED');
            return ApiResponseHelper.success({
                locked: false,
                rtm_event: { type: 'ROOM_LOCK_UPDATED', locked: false },
            }, "Oda kilidi kaldırıldı.");
        }

        if (!/^\d{6}$/.test(trimmedPassword)) {
            return ApiResponseHelper.error("Şifre 6 haneli rakamlardan oluşmalıdır.", 400);
        }

        await prisma.room.update({ where: { id: room.id }, data: { isLocked: true, password: trimmedPassword } });
        logRoomEvent(room.id, actorId, 'ROOM_LOCKED');

        return ApiResponseHelper.success({
            locked: true,
            rtm_event: { type: 'ROOM_LOCK_UPDATED', locked: true },
        }, "Oda kilitlendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
