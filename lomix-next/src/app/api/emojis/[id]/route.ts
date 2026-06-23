import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { del } from '@vercel/blob';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);
        const { categoryId, name, imageUrl, svgaUrl, price, isVisible, order } = await req.json();
        if (!name?.trim() || !categoryId || !imageUrl || price == null) {
            return NextResponse.json({ success: false, message: 'categoryId, name, imageUrl ve price zorunludur.' }, { status: 400 });
        }
        const emoji = await prisma.emoji.update({
            where: { id },
            data: {
                categoryId: parseInt(categoryId, 10),
                name: name.trim(),
                imageUrl,
                svgaUrl: svgaUrl || null,
                price: parseInt(price, 10),
                isVisible: isVisible ?? true,
                order: order ?? 0,
            },
            include: { category: { select: { id: true, name: true } } },
        });
        return NextResponse.json({ success: true, emoji });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);
        const emoji = await prisma.emoji.findUnique({ where: { id } });
        if (emoji) {
            await prisma.emoji.delete({ where: { id } });
            for (const url of [emoji.imageUrl, emoji.svgaUrl]) {
                if (url && (url.includes('vercel-storage.com') || url.includes('blob.vercel'))) {
                    try { await del(url); } catch {}
                }
            }
        }
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
