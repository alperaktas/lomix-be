import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.roomWordFilter.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ message: 'Kelime filtresi silindi' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
