import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Admin actions: kick, mute, close, rename
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const roomDbId = parseInt(id);
        const body = await req.json();
        const { action, targetUserId, slotIndex, adminId, details } = body;

        const room = await prisma.room.findUnique({ where: { id: roomDbId } });
        if (!room) return NextResponse.json({ message: 'Oda bulunamadı' }, { status: 404 });

        let result: any = {};

        switch (action) {
            case 'kick':
                if (!targetUserId) return NextResponse.json({ message: 'targetUserId zorunlu' }, { status: 400 });
                await prisma.roomParticipant.deleteMany({
                    where: { roomId: roomDbId, userId: targetUserId },
                });
                await prisma.roomMicSlot.updateMany({
                    where: { roomId: roomDbId, userId: targetUserId },
                    data: { userId: null },
                });
                result = { message: 'Kullanıcı odadan atıldı' };
                break;

            case 'mute':
                if (slotIndex === undefined) return NextResponse.json({ message: 'slotIndex zorunlu' }, { status: 400 });
                await prisma.roomMicSlot.updateMany({
                    where: { roomId: roomDbId, slotIndex },
                    data: { isMuted: true },
                });
                result = { message: 'Mikrofon kapatıldı' };
                break;

            case 'unmute':
                if (slotIndex === undefined) return NextResponse.json({ message: 'slotIndex zorunlu' }, { status: 400 });
                await prisma.roomMicSlot.updateMany({
                    where: { roomId: roomDbId, slotIndex },
                    data: { isMuted: false },
                });
                result = { message: 'Mikrofon açıldı' };
                break;

            case 'close':
                await prisma.room.update({
                    where: { id: roomDbId },
                    data: { isLive: false, isClosed: true },
                });
                result = { message: 'Oda kapatıldı' };
                break;

            default:
                return NextResponse.json({ message: 'Geçersiz action' }, { status: 400 });
        }

        // Log the admin action
        if (adminId) {
            await prisma.roomAdminLog.create({
                data: {
                    roomId: roomDbId,
                    adminId,
                    action,
                    targetId: targetUserId || null,
                    details: details || null,
                },
            });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
