import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/room/request:
 *   post:
 *     summary: Mikrofon talebini kabul et veya reddet (sadece oda sahibi)
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, userId, requestType]
 *             properties:
 *               roomId:
 *                 type: string
 *               userId:
 *                 type: integer
 *                 description: Talebi yapan kullanıcının ID'si
 *               requestType:
 *                 type: string
 *                 enum: [accept, reject]
 *     responses:
 *       200:
 *         description: Talep güncellendi
 *       403:
 *         description: Yetkisiz
 *       404:
 *         description: Oda veya talep bulunamadı
 */
export async function POST(request: Request) {
    try {
        const ownerId = await getCurrentUserId(request);
        if (!ownerId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId, userId, requestType } = await request.json();

        if (!roomId || !userId || !requestType) {
            return ApiResponseHelper.error("roomId, userId ve requestType zorunludur.", 400);
        }

        if (!["accept", "reject"].includes(requestType)) {
            return ApiResponseHelper.error("requestType 'accept' veya 'reject' olmalıdır.", 400);
        }

        const where = isNaN(Number(roomId))
            ? { roomId: String(roomId) }
            : { id: Number(roomId) };

        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        if (room.ownerId !== ownerId) {
            return ApiResponseHelper.error("Bu işlem için yetkiniz yok.", 403);
        }

        const micRequest = await prisma.roomMicRequest.findUnique({
            where: { roomId_userId: { roomId: room.id, userId: Number(userId) } },
        });

        if (!micRequest) return ApiResponseHelper.error("Talep bulunamadı.", 404);
        if (micRequest.status !== "pending") {
            return ApiResponseHelper.error("Bu talep zaten sonuçlandırılmış.", 400);
        }

        const newStatus = requestType === "accept" ? "accepted" : "rejected";

        await prisma.roomMicRequest.update({
            where: { id: micRequest.id },
            data: { status: newStatus },
        });

        const message = requestType === "accept"
            ? "Talep kabul edildi."
            : "Talep reddedildi.";

        return ApiResponseHelper.success({ userId: String(userId), status: newStatus }, message);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
