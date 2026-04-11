import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/mobile/auth/verify:
 *   post:
 *     summary: Kod doğrulama (Hesap aktivasyonu veya Şifre sıfırlama)
 *     tags: [Mobile Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [activation, reset_password]
 *     responses:
 *       200:
 *         description: Doğrulama başarılı
 *       400:
 *         description: Hatalı veya süresi dolmuş kod
 *       404:
 *         description: Kullanıcı bulunamadı
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, code, type } = body; // type: 'activation' | 'reset_password'

        if (!email || !code) {
            return ApiResponseHelper.error('E-posta ve doğrulama kodu zorunludur.', 400);
        }

        const user = await prisma.user.findFirst({ where: { email } });
        if (!user) {
            return ApiResponseHelper.error('Kullanıcı bulunamadı.', 404);
        }

        console.log(`Doğrulama: ${type || 'activation'} - Email: ${email}`);

        // Şifre Sıfırlama
        if (type === 'reset_password' || (!type && user.status === 'active')) {
            if (!user.resetPasswordCode) {
                return ApiResponseHelper.error('Talep bulunamadı.', 400);
            }
            if (user.resetPasswordExpires && new Date() > user.resetPasswordExpires) {
                return ApiResponseHelper.error('Kod süresi dolmuş.', 400);
            }
            if (String(user.resetPasswordCode).trim() !== String(code).trim()) {
                return ApiResponseHelper.error('Geçersiz kod.', 400);
            }
            return ApiResponseHelper.success({}, 'Kod doğrulandı.');
        }
        // Hesap Aktivasyonu
        else {
            if (user.status === 'active') {
                return ApiResponseHelper.success({}, 'Hesap zaten aktif.');
            }
            if (String(user.verificationCode).trim() !== String(code).trim()) {
                return ApiResponseHelper.error('Geçersiz kod.', 400);
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

            return ApiResponseHelper.success({}, 'Hesap başarıyla doğrulandı.');
        }

    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
