import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { put } from '@vercel/blob';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/settings:
 *   post:
 *     summary: Oda ayarlarını güncelle (Sadece Oda Sahibi)
 *     description: |
 *       Oda sahibi; oda adını, fotoğrafını ve mikrofon üyelik kısıtlamasını güncelleyebilir.
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [roomId]
 *             properties:
 *               roomId:
 *                 type: string
 *               name:
 *                 type: string
 *               memberOnlyMic:
 *                 type: boolean
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Ayarlar güncellendi
 *       403:
 *         description: Sadece oda sahibi güncelleyebilir
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const formData = await request.formData();
        const roomId = formData.get('roomId') as string;
        if (!roomId) return ApiResponseHelper.error("roomId zorunludur.", 400);

        const where = isNaN(Number(roomId)) ? { roomId: String(roomId) } : { id: Number(roomId) };
        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        if (room.ownerId !== userId) {
            return ApiResponseHelper.error("Bu ayarları sadece oda sahibi değiştirebilir.", 403);
        }

        const updateData: Record<string, any> = {};

        const name = formData.get('name') as string | null;
        if (name && name.trim()) updateData.name = name.trim();

        const memberOnlyMic = formData.get('memberOnlyMic');
        if (memberOnlyMic !== null) {
            updateData.memberOnlyMic = memberOnlyMic === 'true' || memberOnlyMic === '1';
        }

        const image = formData.get('image') as File | null;
        if (image && typeof image !== 'string') {
            const blob = await put(image.name, image, { access: 'public', addRandomSuffix: true });
            updateData.thumbnailUrl = blob.url;
        }

        if (Object.keys(updateData).length === 0) {
            return ApiResponseHelper.error("Güncellenecek alan gönderilmedi.", 400);
        }

        const updated = await prisma.room.update({
            where: { id: room.id },
            data: updateData,
            select: { roomId: true, name: true, thumbnailUrl: true, memberOnlyMic: true },
        });

        const rtm_event: Record<string, any> = { type: 'SETTINGS_UPDATED' };
        if (updateData.name) rtm_event.name = updated.name;
        if (updateData.memberOnlyMic !== undefined) rtm_event.memberOnlyMic = updated.memberOnlyMic;
        if (updateData.thumbnailUrl) rtm_event.thumbnailUrl = updated.thumbnailUrl;

        logRoomEvent(room.id, userId, 'SETTINGS_UPDATED');

        return ApiResponseHelper.success({
            room_id: updated.roomId,
            name: updated.name,
            thumbnail_url: updated.thumbnailUrl,
            member_only_mic: updated.memberOnlyMic,
            rtm_event,
        }, "Oda ayarları güncellendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
