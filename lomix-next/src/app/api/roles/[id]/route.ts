import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const roleId = Number(id);
        const body = await req.json();
        const { name } = body;

        await prisma.role.update({
            where: { id: roleId },
            data: { name }
        });

        return NextResponse.json({ message: 'Rol güncellendi' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const roleId = Number(id);

        await prisma.role.delete({
            where: { id: roleId }
        });

        return NextResponse.json({ message: 'Rol silindi' });
    } catch (error: any) {
        return NextResponse.json({ message: error.meta?.cause || error.message }, { status: 500 });
    }
}
