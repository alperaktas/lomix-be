import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("Login İsteği Body (Prisma):", body);

        const { email, username, password } = body;
        const identifier = email || username;

        if (!identifier || !password) {
            return NextResponse.json({ message: 'Email/Kullanıcı adı ve şifre zorunludur.' }, { status: 400 });
        }

        // Kullanıcıyı bul
        // Prisma'da OR (veya) sorgusu için OR operatörü kullanılır
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        });

        if (!user) {
            return NextResponse.json({ message: 'Kullanıcı bulunamadı' }, { status: 404 });
        }

        // Kullanıcı durumu kontrolü
        if (user.status === 'suspended') {
            return NextResponse.json({ message: 'Hesabınız askıya alınmıştır.' }, { status: 403 });
        }

        if (user.status === 'pending') {
            // Güvenlik için yine de şifre kontrolü yapıyormuş gibi davranılabilir
            // ama Prisma ile basit tutalım.
            return NextResponse.json({ message: 'Hesabınız onay bekliyor.' }, { status: 403 });
        }

        // Şifre kontrolü
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json({ message: 'Hatalı şifre' }, { status: 401 });
        }

        // Token oluştur
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli',
            { expiresIn: '24h' }
        );

        // Logla (Prisma ile)
        try {
            const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
            const userAgent = req.headers.get('user-agent') || 'unknown';

            await prisma.userLog.create({
                data: {
                    userId: user.id,
                    action: 'LOGIN',
                    ipAddress: ipAddress,
                    userAgent: userAgent
                }
            });
        } catch (logErr) {
            console.error("Log hatası:", logErr);
        }

        // Şifreyi objeden çıkarıp gönder
        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            token,
            user: userWithoutPassword
        });

    } catch (error: any) {
        console.error("Login Hatası (Prisma):", error);
        return NextResponse.json({ message: error.message || 'Sunucu hatası' }, { status: 500 });
    }
}
