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
            select: { id: true, roomId: true, isLive: true, isClosed: true },
        });

        if (!room) {
            return NextResponse.json({ status: false, message: "Oda bulunamadı" }, { status: 404 });
        }

        if (room.isClosed || !room.isLive) {
            return NextResponse.json({ status: false, message: "Oda aktif değil" }, { status: 403 });
        }

        const agoraToken = generateAgoraToken(room.roomId, userId);

        return NextResponse.json({
            status: true,
            message: "Token yenilendi",
            data: {
                agora_token: agoraToken,
                channel_name: room.roomId,
                uid: userId,
            },
        });
    } catch (error: any) {
        console.error("Token refresh error:", error);
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
