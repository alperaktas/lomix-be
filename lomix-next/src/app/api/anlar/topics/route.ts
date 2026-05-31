import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const topics = await prisma.anTopic.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ success: true, topics });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { title, imageUrl, isActive } = await req.json();
        if (!title?.trim()) {
            return NextResponse.json({ success: false, message: 'Başlık zorunludur.' }, { status: 400 });
        }
        const topic = await prisma.anTopic.create({
            data: { title: title.trim(), imageUrl: imageUrl || null, isActive: isActive ?? true },
        });
        return NextResponse.json({ success: true, topic });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
