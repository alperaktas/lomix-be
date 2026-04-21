import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { status, closeRoom } = body;

        const report = await prisma.roomReport.update({
            where: { id: parseInt(id) },
            data: { status },
            include: { room: true },
        });

        if (closeRoom && report.room) {
            await prisma.room.update({
                where: { id: report.room.id },
                data: { isLive: false, isClosed: true },
            });
        }

        return NextResponse.json(report);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
