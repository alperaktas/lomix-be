import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        let name = "";
        let description = "";
        let type = "voice";

        try {
            const formData = await request.formData();
            name = formData.get('name') as string || formData.get('title') as string || "Yeni Oda";
            description = formData.get('description') as string || "";
            type = formData.get('type') as string || "voice";
        } catch {
            const body = await request.json();
            name = body.name || body.title || "Yeni Oda";
            description = body.description || "";
            type = body.type || "voice";
        }

        const newRoom = await prisma.room.create({
            data: {
                name,
                ownerId: userId,
                isLive: true,
                type: type,
                mode: "public",
                viewerCount: 0,
                roomId: "R" + Math.floor(Math.random() * 1000000)
            }
        });

        return NextResponse.json({
            status: true,
            message: "Oda başarıyla oluşturuldu.",
            data: {
                id: newRoom.id,
                room_id: newRoom.roomId,
                name: newRoom.name
            }
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 400 });
    }
}
