import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateAgoraToken } from '@/lib/agora';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { adminId } = body;

        const room = await prisma.room.findUnique({
            where: { id: parseInt(id) },
            select: { id: true, roomId: true, name: true, isLive: true, isClosed: true },
        });

        if (!room) return NextResponse.json({ message: 'Oda bulunamadı' }, { status: 404 });
        if (room.isClosed || !room.isLive) return NextResponse.json({ message: 'Oda aktif değil' }, { status: 403 });

        // Admin gizli katılır — participant listesine eklenmez
        // UID olarak negatif değer kullanarak normal kullanıcılardan ayrıştır
        const adminUid = adminId ? adminId + 100000 : 999999;
        const agoraToken = generateAgoraToken(room.roomId, adminUid);

        await prisma.roomAdminLog.create({
            data: {
                roomId: room!.id,
                adminId: adminId || 1,
                action: 'admin_join',
                details: 'Gizli katılım',
            },
        });

        return NextResponse.json({
            room_id: room.roomId,
            channel_name: room.roomId,
            agora_token: agoraToken,
            app_id: process.env.AGORA_APP_ID,
            uid: adminUid,
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
