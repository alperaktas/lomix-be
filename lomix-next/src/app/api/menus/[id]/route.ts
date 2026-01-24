import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const menuId = Number(id);

        await prisma.menu.delete({
            where: { id: menuId }
        });

        return NextResponse.json({ message: 'Menü silindi' });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
