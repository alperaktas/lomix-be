import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, code, type } = body; // type: 'activation' | 'reset_password'

        if (!email || !code) {
            return NextResponse.json({
                error_code: 'VALIDATION_ERROR',
                message: 'E-posta ve doğrulama kodu zorunludur.'
            }, { status: 400 });
        }

        const user = await prisma.user.findFirst({ where: { email } });
        if (!user) {
            return NextResponse.json({ error_code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı.' }, { status: 404 });
        }

        console.log(`Doğrulama: ${type || 'activation'} - Email: ${email}`);

        // Şifre Sıfırlama
        if (type === 'reset_password' || (!type && user.status === 'active')) {
            if (!user.resetPasswordCode) {
                return NextResponse.json({ error_code: 'CODE_NOT_FOUND', message: 'Talep bulunamadı.' }, { status: 400 });
            }
            if (user.resetPasswordExpires && new Date() > user.resetPasswordExpires) {
                return NextResponse.json({ error_code: 'CODE_EXPIRED', message: 'Kod süresi dolmuş.' }, { status: 400 });
            }
            if (String(user.resetPasswordCode).trim() !== String(code).trim()) {
                return NextResponse.json({ error_code: 'INVALID_CODE', message: 'Geçersiz kod.' }, { status: 400 });
            }
            return NextResponse.json({ message: 'Kod doğrulandı.' });
        }
        // Hesap Aktivasyonu
        else {
            if (user.status === 'active') {
                return NextResponse.json({ message: 'Hesap zaten aktif.' });
            }
            if (String(user.verificationCode).trim() !== String(code).trim()) {
                return NextResponse.json({ error_code: 'INVALID_CODE', message: 'Geçersiz kod.' }, { status: 400 });
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { status: 'active', verificationCode: null }
            });

            // HOŞ GELDİNİZ MAİLİ GÖNDER
            try {
                const { sendEmail, getEmailTemplate } = await import('@/lib/email');
                const welcomeHtml = getEmailTemplate('welcome', { username: user.username });
                await sendEmail(user.email, 'Lomix - Aramıza Hoş Geldiniz!', welcomeHtml);
            } catch (mailErr) {
                console.error("Welcome mail hatası:", mailErr);
            }

            return NextResponse.json({ message: 'Hesap başarıyla doğrulandı.' });
        }

    } catch (error: any) {
        return NextResponse.json({ error_code: 'SERVER_ERROR', message: error.message }, { status: 500 });
    }
}
