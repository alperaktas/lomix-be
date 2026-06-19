import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const emojis = await prisma.emoji.findMany({ orderBy: { order: 'asc' } });
        return NextResponse.json({ success: true, emojis });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, imageUrl, svgaUrl, order, isVisible } = await req.json();
        if (!name?.trim() || !imageUrl) {
            return NextResponse.json({ success: false, message: 'name ve imageUrl zorunludur.' }, { status: 400 });
        }
        const emoji = await prisma.emoji.create({
            data: { name: name.trim(), imageUrl, svgaUrl: svgaUrl || null, order: order ?? 0, isVisible: isVisible ?? true },
        });
        return NextResponse.json({ success: true, emoji });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
