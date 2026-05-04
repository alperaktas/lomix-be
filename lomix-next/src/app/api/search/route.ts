import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 1) {
        return NextResponse.json({ users: [], rooms: [] });
    }

    const isNumeric = /^\d+$/.test(q);
    const isRoomId = q.toLowerCase().startsWith('r');

    const [users, rooms] = await Promise.all([
        isRoomId ? Promise.resolve([]) : prisma.user.findMany({
            where: isNumeric
                ? { id: parseInt(q) }
                : { OR: [{ username: { contains: q, mode: 'insensitive' } }, { fullName: { contains: q, mode: 'insensitive' } }] },
            select: { id: true, username: true, fullName: true, avatar: true, role: true },
            take: 5,
        }),
        prisma.room.findMany({
            where: isNumeric
                ? { id: parseInt(q) }
                : { OR: [{ roomId: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] },
            select: { id: true, roomId: true, name: true, isLive: true },
            take: 5,
        }),
    ]);

    return NextResponse.json({ users, rooms });
}
