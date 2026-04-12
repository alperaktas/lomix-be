import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * @swagger
 * /api/mobile/room/create:
 *   post:
 *     summary: Yeni Oda Oluştur
 *     description: Kullanıcı için yeni bir sesli veya görüntülü oda oluşturur.
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Oda başlığı
 *               description:
 *                 type: string
 *                 description: Oda açıklaması
 *               type:
 *                 type: string
 *                 enum: [voice, video]
 *                 description: Oda tipi
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Oda kapak fotoğrafı
 *     responses:
 *       200:
 *         description: Oda başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     room_id:
 *                       type: string
 *                     share_url:
 *                       type: string
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
            const bytes = await image.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Dosya adını güvenli hale getir ve benzersiz yap
            const fileName = `${Date.now()}_${image.name.replace(/\s+/g, '_')}`;
            const uploadDir = join(process.cwd(), 'public', 'uploads');
            
            // Klasörün varlığından emin ol
            try {
                await mkdir(uploadDir, { recursive: true });
            } catch (err) {
                // Klasör zaten varsa hata vermez
            }

            const path = join(uploadDir, fileName);
            await writeFile(path, buffer);
            thumbnailUrl = `/uploads/${fileName}`;
        }

        const roomId = "room_" + Math.floor(100000 + Math.random() * 900000);

        const newRoom = await prisma.room.create({
            data: {
                name: title,
                description: description,
                ownerId: userId,
                isLive: true,
                type: type,
                mode: "public",
                viewerCount: 0,
                roomId: roomId,
                thumbnailUrl: thumbnailUrl
            }
        });

        return NextResponse.json({
            status: true,
            message: "Oda başarıyla oluşturuldu.",
            data: {
                room_id: newRoom.roomId,
                share_url: `https://lomix.com/room/${newRoom.roomId.replace('room_', '')}`
            }
        });
    } catch (error: any) {
        console.error("Room creation error:", error);
        return NextResponse.json({ status: false, message: error.message }, { status: 400 });
    }
}
