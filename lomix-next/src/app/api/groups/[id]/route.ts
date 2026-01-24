import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const groupId = Number(id);

        await prisma.group.delete({
            where: { id: groupId }
        });

        return NextResponse.json({ message: 'Grup silindi' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
