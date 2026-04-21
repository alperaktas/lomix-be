import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const filters = await prisma.roomWordFilter.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(filters);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const words: string[] = (body.words || [body.word]).filter(Boolean);

        const created = await Promise.all(
            words.map(w =>
                prisma.roomWordFilter.upsert({
                    where: { word: w.toLowerCase().trim() },
                    create: { word: w.toLowerCase().trim() },
                    update: {},
                })
            )
        );

        return NextResponse.json(created, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
