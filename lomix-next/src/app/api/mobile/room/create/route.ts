import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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
            const fileName = `${Date.now()}_${image.name.replace(/\s+/g, '_')}`;
            const uploadDir = join(process.cwd(), 'public', 'uploads');
            try { await mkdir(uploadDir, { recursive: true }); } catch {}
            await writeFile(join(uploadDir, fileName), buffer);
            thumbnailUrl = `/uploads/${fileName}`;
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
