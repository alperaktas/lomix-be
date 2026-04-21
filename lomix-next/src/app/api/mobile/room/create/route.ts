import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
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
            const blob = await put(image.name, image, {
                access: 'public',
            });
            thumbnailUrl = blob.url;
        }

        const roomId = "room_" + Math.floor(100000 + Math.random() * 900000);
        const channelName = roomId; // Agora channel adı = roomId

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
            }
        });

        return NextResponse.json({
            status: true,
            message: "Oda başarıyla oluşturuldu.",
            data: {
                room_id: newRoom.roomId,
                channel_name: channelName,
                share_url: `https://lomix.com/room/${newRoom.roomId.replace('room_', '')}`,
            }
        });
    } catch (error: any) {
        console.error("Room creation error:", error);
        return NextResponse.json({ status: false, message: error.message }, { status: 400 });
    }
}
