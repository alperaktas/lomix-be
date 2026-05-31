import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: any) {
    try {
        const { id } = await params;
        const { title, imageUrl, isActive } = await req.json();
        const topic = await prisma.anTopic.update({
            where: { id: Number(id) },
            data: {
                ...(title !== undefined && { title: title.trim() }),
                ...(imageUrl !== undefined && { imageUrl }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        return NextResponse.json({ success: true, topic });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: any) {
    try {
        const { id } = await params;
        await prisma.anTopic.delete({ where: { id: Number(id) } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
