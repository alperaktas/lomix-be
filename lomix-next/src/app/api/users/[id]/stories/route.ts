import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_req: Request, { params }: any) {
    try {
        const { id } = await params;
        const stories = await prisma.story.findMany({
            where: { userId: Number(id) },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ stories });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: any) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const storyId = Number(searchParams.get('id'));
        if (!storyId) return NextResponse.json({ message: 'id zorunludur.' }, { status: 400 });

        // Ownership check
        const story = await prisma.story.findUnique({ where: { id: storyId } });
        if (!story || story.userId !== Number(id)) {
            return NextResponse.json({ message: 'Hikaye bulunamadı.' }, { status: 404 });
        }

        await prisma.story.delete({ where: { id: storyId } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
