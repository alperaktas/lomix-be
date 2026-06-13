import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id, 10);
        const { name, order, isActive } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ success: false, message: 'İsim zorunludur.' }, { status: 400 });
        }
        const category = await prisma.giftCategory.update({
            where: { id },
            data: { name: name.trim(), order: order ?? 0, isActive: isActive ?? true },
        });
        return NextResponse.json({ success: true, category });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id, 10);
        await prisma.giftCategory.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
