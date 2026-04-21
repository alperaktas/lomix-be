import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { generateAgoraToken } from '@/lib/agora';

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const { roomId } = await request.json();
        if (!roomId) {
            return NextResponse.json({ status: false, message: "roomId zorunludur" }, { status: 400 });
        }

        const room = await prisma.room.findUnique({
            where: { roomId: String(roomId) },
            select: { id: true, roomId: true, name: true, isLive: true, isClosed: true, minLevel: true },
        });

        if (!room) {
            return NextResponse.json({ status: false, message: "Oda bulunamadı" }, { status: 404 });
        }

        if (room.isClosed || !room.isLive) {
            return NextResponse.json({ status: false, message: "Bu oda aktif değil" }, { status: 403 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { level: true },
        });

        if (user && user.level < room.minLevel) {
            return NextResponse.json({ status: false, message: `Bu odaya katılmak için minimum seviye ${room.minLevel} gerekiyor` }, { status: 403 });
        }

        // Katılımcıyı kaydet (zaten varsa güncelleme yapma)
        await prisma.roomParticipant.upsert({
            where: { roomId_userId: { roomId: room.id, userId } },
            create: { roomId: room.id, userId },
            update: {},
        });

        // Görüntüleyici sayısını güncelle
        await prisma.room.update({
            where: { id: room.id },
            data: { viewerCount: { increment: 1 } },
        });

        const agoraToken = generateAgoraToken(room.roomId, userId);

        return NextResponse.json({
            status: true,
            message: "Odaya katıldınız",
            data: {
                room_id: room.roomId,
                channel_name: room.roomId,
                agora_token: agoraToken,
                uid: userId,
            },
        });
    } catch (error: any) {
        console.error("Room join error:", error);
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
