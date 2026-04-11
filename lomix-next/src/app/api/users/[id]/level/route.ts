import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT: Level değiştir
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const userId = Number(id);
        const { level } = await req.json();

        if (!level || typeof level !== 'number' || level < 1 || level > 999) {
            return NextResponse.json({ message: 'Geçerli bir level belirtin (1-999)' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { level },
        });

        await prisma.userLog.create({
            data: {
                userId,
                action: `Level değiştirildi: ${level}`,
            }
        });

        return NextResponse.json({ message: 'Level güncellendi', level: user.level });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
