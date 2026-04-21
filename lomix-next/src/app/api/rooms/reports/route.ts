import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || 'pending';

        const reports = await prisma.roomReport.findMany({
            where: status !== 'all' ? { status } : {},
            include: {
                room: { select: { id: true, roomId: true, name: true, isLive: true } },
                reporter: { select: { id: true, username: true, avatar: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(reports);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
