import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, getEmailTemplate } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error_code: 'VALIDATION_ERROR', message: 'E-posta zorunlu.' }, { status: 400 });
        }

        const user = await prisma.user.findFirst({ where: { email } });
        if (!user) {
            return NextResponse.json({ error_code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı.' }, { status: 404 });
        }

        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const expires = new Date(Date.now() + 3600000); // 1 saat

        await prisma.user.update({
            where: { id: user.id },
            data: { resetPasswordCode: code, resetPasswordExpires: expires }
        });

        const htmlContent = getEmailTemplate('reset-password', { resetCode: code });
        await sendEmail(email, 'Lomix - Şifre Sıfırlama', htmlContent);

        return NextResponse.json({ message: 'Şifre sıfırlama kodu gönderildi.' });
    } catch (error: any) {
        return NextResponse.json({ error_code: 'SERVER_ERROR', message: error.message }, { status: 500 });
    }
}
