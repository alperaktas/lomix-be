import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT: Cinsiyet değiştir
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const userId = Number(id);
        const { gender } = await req.json();

        if (!gender || !['male', 'female', 'other'].includes(gender)) {
            return NextResponse.json({ message: 'Geçersiz cinsiyet değeri' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { gender },
        });

        return NextResponse.json({ message: 'Cinsiyet güncellendi', gender: user.gender });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
