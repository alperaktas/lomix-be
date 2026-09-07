import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { uploadRoomThumbnail } from '@/lib/room-thumbnail';
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
 *               room_topic:
 *                 type: string
 *                 description: Oda konusu
 *               room_desc_message:
 *                 type: string
 *                 description: Oda tanıtım mesajı
 *               room_theme:
 *                 type: string
 *                 description: Oda teması
 *               mic_settings:
 *                 type: boolean
 *                 description: Mikrofon ayarları
 *               block_kick_settings:
 *                 type: boolean
 *                 description: Odadan atma/block ayarları
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

        const numericId = Number(roomId);
        const where = { OR: [{ roomId: String(roomId) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] };
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

        const roomTopic = formData.get('room_topic') as string | null;
        if (roomTopic !== null) updateData.roomTopic = roomTopic.trim();

        const roomDescMessage = formData.get('room_desc_message') as string | null;
        if (roomDescMessage !== null) updateData.roomDescMessage = roomDescMessage.trim();

        const roomTheme = formData.get('room_theme') as string | null;
        if (roomTheme !== null) updateData.roomTheme = roomTheme.trim();

        const micSettings = formData.get('mic_settings');
        if (micSettings !== null) {
            updateData.micSettings = micSettings === 'true' || micSettings === '1';
        }

        const blockKickSettings = formData.get('block_kick_settings');
        if (blockKickSettings !== null) {
            updateData.blockKickSettings = blockKickSettings === 'true' || blockKickSettings === '1';
        }

        const image = formData.get('image') as File | null;
        if (image && typeof image !== 'string') {
            const upload = await uploadRoomThumbnail(image);
            if (!upload.ok) return ApiResponseHelper.error(upload.message, 400);
            updateData.thumbnailUrl = upload.url;
        }

        if (Object.keys(updateData).length === 0) {
            return ApiResponseHelper.error("Güncellenecek alan gönderilmedi.", 400);
        }

        const updated = await prisma.room.update({
            where: { id: room.id },
            data: updateData,
            select: {
                roomId: true,
                name: true,
                thumbnailUrl: true,
                memberOnlyMic: true,
                roomTopic: true,
                roomDescMessage: true,
                roomTheme: true,
                micSettings: true,
                blockKickSettings: true,
            },
        });

        const rtm_event: Record<string, any> = { type: 'SETTINGS_UPDATED' };
        if (updateData.name) rtm_event.name = updated.name;
        if (updateData.memberOnlyMic !== undefined) rtm_event.memberOnlyMic = updated.memberOnlyMic;
        if (updateData.thumbnailUrl) rtm_event.thumbnailUrl = updated.thumbnailUrl;
        if (updateData.roomTopic !== undefined) rtm_event.roomTopic = updated.roomTopic;
        if (updateData.roomDescMessage !== undefined) rtm_event.roomDescMessage = updated.roomDescMessage;
        if (updateData.roomTheme !== undefined) rtm_event.roomTheme = updated.roomTheme;
        if (updateData.micSettings !== undefined) rtm_event.micSettings = updated.micSettings;
        if (updateData.blockKickSettings !== undefined) rtm_event.blockKickSettings = updated.blockKickSettings;

        logRoomEvent(room.id, userId, 'SETTINGS_UPDATED');

        return ApiResponseHelper.success({
            room_id: updated.roomId,
            name: updated.name,
            thumbnail_url: updated.thumbnailUrl,
            member_only_mic: updated.memberOnlyMic,
            room_topic: updated.roomTopic,
            room_desc_message: updated.roomDescMessage,
            room_theme: updated.roomTheme,
            mic_settings: updated.micSettings,
            block_kick_settings: updated.blockKickSettings,
            rtm_event,
        }, "Oda ayarları güncellendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
