import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Ban kaldır
export async function POST(req: Request, { params }: any) {
    try {
        const { id } = await params;
        const userId = Number(id);

        if (isNaN(userId)) {
            return NextResponse.json({ message: 'Geçersiz kullanıcı ID' }, { status: 400 });
        }

        // User'dan ban bilgilerini temizle
        await prisma.user.update({
            where: { id: userId },
            data: {
                bannedUntil: null,
                banReason: null,
                isPermanentBan: false,
                bannedDeviceId: null,
                status: 'active',
            },
        });

        // Aktif banları pasife çek
        await prisma.userBan.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
        });

        return NextResponse.json({ message: 'Ban kaldırıldı' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
