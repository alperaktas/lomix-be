import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const categoryId = searchParams.get('categoryId');
        const emojis = await prisma.emoji.findMany({
            where: categoryId ? { categoryId: parseInt(categoryId, 10) } : undefined,
            orderBy: { order: 'asc' },
            include: { category: { select: { id: true, name: true } } },
        });
        return NextResponse.json({ success: true, emojis });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { categoryId, name, imageUrl, svgaUrl, price, isVisible, order } = await req.json();
        if (!name?.trim() || !categoryId || !imageUrl || price == null) {
            return NextResponse.json({ success: false, message: 'categoryId, name, imageUrl ve price zorunludur.' }, { status: 400 });
        }
        const emoji = await prisma.emoji.create({
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
