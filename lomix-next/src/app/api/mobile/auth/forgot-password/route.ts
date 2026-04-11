import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { sendEmail, getEmailTemplate } from '@/lib/email';

/**
 * @swagger
 * /api/mobile/auth/forgot-password:
 *   post:
 *     summary: Şifre sıfırlama kodu gönder
 *     tags: [Mobile Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Kod başarıyla gönderildi
 *       404:
 *         description: Kullanıcı bulunamadı
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return ApiResponseHelper.error('E-posta zorunlu.', 400);
        }

        const user = await prisma.user.findFirst({ where: { email } });
        if (!user) {
            return ApiResponseHelper.error('Kullanıcı bulunamadı.', 404);
        }

        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const expires = new Date(Date.now() + 3600000); // 1 saat

        await prisma.user.update({
            where: { id: user.id },
            data: { resetPasswordCode: code, resetPasswordExpires: expires }
        });

        const htmlContent = getEmailTemplate('reset-password', { resetCode: code });
        await sendEmail(email, 'Lomix - Şifre Sıfırlama', htmlContent);

        return ApiResponseHelper.success({}, 'Şifre sıfırlama kodu gönderildi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
