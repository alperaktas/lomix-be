import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Kullanıcının an paylaşma yasağını aç/kapat
export async function POST(req: Request, { params }: any) {
    try {
        const { id } = await params;
        const userId = Number(id);

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { anBanned: true } });
        if (!user) return NextResponse.json({ message: 'Kullanıcı bulunamadı' }, { status: 404 });

        const newState = !user.anBanned;
        await prisma.user.update({ where: { id: userId }, data: { anBanned: newState } });

        return NextResponse.json({
            success: true,
            anBanned: newState,
            message: newState ? 'An paylaşma yasağı uygulandı.' : 'An paylaşma yasağı kaldırıldı.',
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
