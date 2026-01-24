import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

// Helper: Token'dan User ID al
const getUserIdFromToken = async () => {
    const headersList = await headers();
    const token = headersList.get('authorization')?.split(' ')[1];
    if (!token) return null;
    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli');
        return decoded.id;
    } catch {
        return null;
    }
};

export async function PUT(req: Request) {
    try {
        const userId = await getUserIdFromToken();
        if (!userId) {
            return NextResponse.json({ message: 'Yetkisiz erişim' }, { status: 401 });
        }

        const body = await req.json();
        const { phone, avatar } = body; // Avatar URL olarak gelmeli (Dosya yükleme ayrı bir endpoint olmalı)

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                phone,
                avatar
            }
        });

        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json({ message: 'Profil güncellendi', user: userWithoutPassword });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
