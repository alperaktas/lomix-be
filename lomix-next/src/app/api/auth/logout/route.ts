import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                // Token'ı decode et ve kullanıcı ID'sini al
                const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli');

                // Log at
                await prisma.userLog.create({
                    data: {
                        userId: decoded.id,
                        action: 'LOGOUT',
                        ipAddress: req.headers.get('x-forwarded-for'),
                        userAgent: req.headers.get('user-agent')
                    }
                });
            } catch (e) {
                // Token geçersizse bile logout başarılı sayılır
            }
        }

        return NextResponse.json({ message: 'Çıkış yapıldı' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
