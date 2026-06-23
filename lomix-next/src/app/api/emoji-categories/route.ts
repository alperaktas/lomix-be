import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const categories = await prisma.emojiCategory.findMany({
            orderBy: { order: 'asc' },
            include: { _count: { select: { emojis: true } } },
        });
        return NextResponse.json({ success: true, categories });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, order, isActive } = await req.json();
        if (!name?.trim()) return NextResponse.json({ success: false, message: 'İsim zorunludur.' }, { status: 400 });
        const category = await prisma.emojiCategory.create({
            data: { name: name.trim(), order: order ?? 0, isActive: isActive ?? true },
        });
        return NextResponse.json({ success: true, category });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
