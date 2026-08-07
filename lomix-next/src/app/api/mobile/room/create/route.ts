import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { logRoomEvent } from '@/lib/room-log';
import { createAgoraChatRoom, registerAgoraChatUser } from '@/lib/agora';
import { put } from '@vercel/blob';

/**
 * @swagger
 * /api/mobile/room/create:
 *   post:
 *     summary: Yeni Oda Oluştur
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 default: Yeni Oda
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [voice, video]
 *                 default: voice
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Oda başarıyla oluşturuldu
 *       400:
 *         description: Hatalı istek
 *       401:
 *         description: Yetkisiz erişim
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const title = formData.get('title') as string || "Yeni Oda";
        const description = formData.get('description') as string || "";
        const type = formData.get('type') as string || "voice";
        const image = formData.get('image') as File | null;

        let thumbnailUrl = null;

        if (image && typeof image !== 'string') {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            const ext = (image.name.split('.').pop() || '').toLowerCase();

            const isValidMime = allowedTypes.includes(image.type);
            const isValidExt = allowedExts.includes(ext);

            if (!isValidMime && !isValidExt) {
                return NextResponse.json({ status: false, message: "Sadece JPEG, PNG, GIF veya WebP dosyaları kabul edilir." }, { status: 400 });
            }

            if (image.size > 5 * 1024 * 1024) {
                return NextResponse.json({ status: false, message: "Dosya boyutu 5MB'dan büyük olamaz." }, { status: 400 });
            }

            const blob = await put(`room-thumbnails/room_${Date.now()}.${ext}`, image, { access: 'public' });
            thumbnailUrl = blob.url;
        }

        const DEFAULT_MIC_COUNT = 8;

        // Owner'ı Agora Chat'e kaydet ve chatroom oluştur (opsiyonel)
        let agoraChatRoomId: string | null = null;
        try {
            await registerAgoraChatUser(String(userId));
            agoraChatRoomId = await createAgoraChatRoom(title, String(userId));
        } catch (e: any) {
            console.warn("Agora Chat devre dışı, oda chatsiz oluşturuluyor:", e.message);
        }

        // roomId olarak DB'nin auto-increment id'si kullanılacak — önce geçici bir değerle oluştur
        const newRoom = await prisma.room.create({
            data: {
                name: title,
                description,
                ownerId: userId,
                isLive: true,
                type,
                mode: "public",
                viewerCount: 1,
                roomId: "tmp",
                thumbnailUrl,
                micCount: DEFAULT_MIC_COUNT,
                agoraChatRoomId,
                members: {
                    create: { userId, role: 'owner' },
                },
                participants: {
                    create: { userId },
                },
                micSlots: {
                    create: Array.from({ length: DEFAULT_MIC_COUNT }, (_, i) => ({
                        slotIndex: i,
                        label: `Mikrofon ${i + 1}`,
                    })),
                },
            }
        });

        // roomId = offset tabanlı, minimum 6 hane
        const roomId = String(100000 + newRoom.id);
        await prisma.room.update({ where: { id: newRoom.id }, data: { roomId } });
        const channelName = roomId;

        logRoomEvent(newRoom.id, userId, 'ROOM_CREATED');

        return NextResponse.json({
            status: true,
            message: "Oda başarıyla oluşturuldu.",
            data: {
                room_id: newRoom.roomId,
                channel_name: channelName,
                agora_chat_room_id: agoraChatRoomId,
                mic_count: DEFAULT_MIC_COUNT,
                share_url: `https://lomix.com/room/${newRoom.roomId}`,
            }
        });
    } catch (error: any) {
        console.error("Room creation error:", error);
        return NextResponse.json({ status: false, message: error.message }, { status: 400 });
    }
}
