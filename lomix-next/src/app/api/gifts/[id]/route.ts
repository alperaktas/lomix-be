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
        const gift = await prisma.gift.update({
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
        return NextResponse.json({ success: true, gift });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);
        const gift = await prisma.gift.findUnique({ where: { id } });
        if (gift) {
            await prisma.gift.delete({ where: { id } });
            if (gift.imageUrl?.includes('vercel-storage.com') || gift.imageUrl?.includes('blob.vercel')) {
                try { await del(gift.imageUrl); } catch {}
            }
            if (gift.svgaUrl && (gift.svgaUrl.includes('vercel-storage.com') || gift.svgaUrl.includes('blob.vercel'))) {
                try { await del(gift.svgaUrl); } catch {}
            }
        }
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
