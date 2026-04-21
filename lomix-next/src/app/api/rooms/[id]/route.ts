import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const room = await prisma.room.findUnique({
            where: { id: parseInt(id) },
            include: {
                owner: { select: { id: true, username: true, avatar: true, email: true } },
                participants: {
                    include: { user: { select: { id: true, username: true, avatar: true, level: true, isVip: true } } },
                    orderBy: { joinedAt: 'asc' },
                },
                micSlots: {
                    include: { user: { select: { id: true, username: true, avatar: true } } },
                    orderBy: { slotIndex: 'asc' },
                },
                messages: {
                    include: { user: { select: { id: true, username: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                },
                reports: {
                    include: { reporter: { select: { id: true, username: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                adminLogs: {
                    include: { admin: { select: { id: true, username: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
                _count: { select: { participants: true, reports: true } },
            },
        });

        if (!room) return NextResponse.json({ message: 'Oda bulunamadı' }, { status: 404 });

        return NextResponse.json(room);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, description, thumbnailUrl, micCount, isVip, isLocked, password, isLive, isClosed } = body;

        const data: any = {};
        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl;
        if (micCount !== undefined) data.micCount = parseInt(micCount);
        if (isVip !== undefined) data.isVip = isVip;
        if (isLocked !== undefined) data.isLocked = isLocked;
        if (password !== undefined) data.password = password || null;
        if (isLive !== undefined) data.isLive = isLive;
        if (isClosed !== undefined) data.isClosed = isClosed;

        const room = await prisma.room.update({
            where: { id: parseInt(id) },
            data,
        });

        return NextResponse.json(room);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.room.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ message: 'Oda silindi' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
