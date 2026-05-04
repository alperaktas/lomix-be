import { ApiResponseHelper } from '@/lib/api-response';
import { generateRtmToken } from '@/lib/agora';
import { getCurrentUserId } from '@/lib/current-user';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/mobile/room/rtm-token:
 *   post:
 *     summary: Agora RTM token al (mesajlaşma için)
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
 *         description: RTM token döndürüldü
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

        const room = await prisma.room.findFirst({ where, select: { id: true, roomId: true } });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        // RTM userId string olmalı
        const rtmUserId = String(userId);
        const rtmToken = generateRtmToken(rtmUserId);

        return ApiResponseHelper.success({
            rtm_token: rtmToken,
            rtm_uid: rtmUserId,
            channel_name: room.roomId,
            app_id: process.env.NEXT_PUBLIC_AGORA_APP_ID,
        }, "RTM token oluşturuldu.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
