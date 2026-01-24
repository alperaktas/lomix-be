import { NextResponse } from 'next/server';
import { sendEmail, getEmailTemplate } from '@/lib/email';

export async function GET(req: Request) {
    try {
        const email = 'aymarto07@gmail.com';

        // 1. Doğrulama Maili Testi
        const verifyHtml = getEmailTemplate('verification', {
            username: 'TestKullanici',
            verificationCode: '1234'
        });
        await sendEmail(email, 'Lomix - Test Doğrulama (Verification)', verifyHtml);

        // 2. Şifre Sıfırlama Maili Testi
        const resetHtml = getEmailTemplate('reset-password', {
            resetCode: '9876'
        });
        await sendEmail(email, 'Lomix - Test Şifre Sıfırlama (Reset)', resetHtml);

        return NextResponse.json({ message: `Test mailleri ${email} adresine gönderildi.` });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
