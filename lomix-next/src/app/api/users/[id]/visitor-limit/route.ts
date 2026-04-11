import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT: Ziyaretçi görme limiti ayarla
export async function PUT(req: Request, { params }: any) {
    try {
        const { id } = await params;
        const userId = Number(id);
        const { limit } = await req.json();

        if (limit === undefined || typeof limit !== 'number' || limit < 0 || limit > 9999) {
            return NextResponse.json({ message: 'Geçerli bir limit belirtin (0-9999)' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { visitorViewLimit: limit },
        });

        await prisma.userLog.create({
            data: {
                userId,
                action: `Ziyaretçi görme limiti değiştirildi: ${limit}`,
            }
        });

        return NextResponse.json({ message: 'Limit güncellendi', visitorViewLimit: user.visitorViewLimit });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
