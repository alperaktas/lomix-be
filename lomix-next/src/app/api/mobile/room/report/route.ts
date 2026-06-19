import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { logRoomEvent } from '@/lib/room-log';

const VALID_REASONS = ['spam', 'inappropriate', 'harassment', 'fake', 'other'];

/**
 * @swagger
 * /api/mobile/room/report:
 *   post:
 *     summary: Odayı raporla
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, reason]
 *             properties:
 *               roomId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 enum: [spam, inappropriate, harassment, fake, other]
 *               description:
 *                 type: string
 *                 description: Ek açıklama (isteğe bağlı)
 *     responses:
 *       200:
 *         description: Rapor gönderildi
 *       400:
 *         description: Geçersiz istek veya daha önce raporlanmış
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId, reason, description } = await request.json();
        if (!roomId || !reason) {
            return ApiResponseHelper.error("roomId ve reason zorunludur.", 400);
        }

        if (!VALID_REASONS.includes(reason)) {
            return ApiResponseHelper.error(`reason şunlardan biri olmalıdır: ${VALID_REASONS.join(', ')}.`, 400);
        }

        const numericId = Number(roomId);
        const where = { OR: [{ roomId: String(roomId) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] };

        const room = await prisma.room.findFirst({ where, select: { id: true } });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        const existing = await prisma.roomReport.findFirst({
            where: { roomId: room.id, reporterId: userId },
        });
        if (existing) return ApiResponseHelper.error("Bu odayı zaten raporladınız.", 400);

        const fullReason = description?.trim()
            ? `${reason}: ${description.trim()}`
            : reason;

        await prisma.roomReport.create({
            data: { roomId: room.id, reporterId: userId, reason: fullReason },
        });

        logRoomEvent(room.id, userId, 'ROOM_REPORTED', null, reason);

        return ApiResponseHelper.success(null, "Raporunuz alındı. Teşekkürler.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
