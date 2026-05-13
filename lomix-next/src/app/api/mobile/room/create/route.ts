import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { put } from '@vercel/blob';
import { logRoomEvent } from '@/lib/room-log';

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
            const blob = await put(image.name, image, {
                access: 'public',
                addRandomSuffix: true,
            });
            thumbnailUrl = blob.url;
        }

        const roomId = "room_" + Math.floor(100000 + Math.random() * 900000);
        const channelName = roomId; // Agora channel adı = roomId

        const DEFAULT_MIC_COUNT = 8;

        const newRoom = await prisma.room.create({
            data: {
                name: title,
                description,
                ownerId: userId,
                isLive: true,
                type,
                mode: "public",
                viewerCount: 0,
                roomId,
                thumbnailUrl,
                micCount: DEFAULT_MIC_COUNT,
                members: {
                    create: { userId, role: 'owner' },
                },
                micSlots: {
                    create: Array.from({ length: DEFAULT_MIC_COUNT }, (_, i) => ({
                        slotIndex: i,
                        label: `Mikrofon ${i + 1}`,
                    })),
                },
            }
        });

        logRoomEvent(newRoom.id, userId, 'ROOM_CREATED');

        return NextResponse.json({
            status: true,
            message: "Oda başarıyla oluşturuldu.",
            data: {
                room_id: newRoom.roomId,
                channel_name: channelName,
                mic_count: DEFAULT_MIC_COUNT,
                share_url: `https://lomix.com/room/${newRoom.roomId.replace('room_', '')}`,
            }
        });
    } catch (error: any) {
        console.error("Room creation error:", error);
        return NextResponse.json({ status: false, message: error.message }, { status: 400 });
    }
}
