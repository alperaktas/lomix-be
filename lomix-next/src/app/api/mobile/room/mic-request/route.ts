import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/room/mic-request:
 *   post:
 *     summary: Mikrofon talebi gönder
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
 *         description: Talep gönderildi
 *       400:
 *         description: Zaten bekleyen talep var
 *       403:
 *         description: Odada değilsiniz
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId } = await request.json();
        if (!roomId) return ApiResponseHelper.error("roomId zorunludur.", 400);

        const where = isNaN(Number(roomId))
            ? { roomId: String(roomId) }
            : { id: Number(roomId) };

        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        if (room.ownerId === userId) {
            return ApiResponseHelper.error("Oda sahibi talep gönderemez.", 400);
        }

        const isParticipant = await prisma.roomParticipant.findUnique({
            where: { roomId_userId: { roomId: room.id, userId } },
        });
        if (!isParticipant) {
            return ApiResponseHelper.error("Önce odaya katılmanız gerekiyor.", 403);
        }

        const existing = await prisma.roomMicRequest.findUnique({
            where: { roomId_userId: { roomId: room.id, userId } },
        });

        if (existing) {
            if (existing.status === "pending") {
                return ApiResponseHelper.error("Zaten bekleyen bir talebiniz var.", 400);
            }
            // Daha önce reddedildiyse yeniden talep oluştur
            await prisma.roomMicRequest.update({
                where: { id: existing.id },
                data: { status: "pending" },
            });
            return ApiResponseHelper.success(null, "Mikrofon talebiniz yeniden gönderildi.");
        }

        await prisma.roomMicRequest.create({
            data: { roomId: room.id, userId },
        });

        return ApiResponseHelper.success(null, "Mikrofon talebiniz gönderildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
