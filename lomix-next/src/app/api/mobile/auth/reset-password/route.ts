import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * /api/mobile/auth/reset-password:
 *   post:
 *     summary: Yeni şifre belirle
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
 *               - newPassword
 *             properties:
 *               email: { type: string }
 *               code: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Şifre başarıyla güncellendi
 *       400:
 *         description: Hatalı veya süresi dolmuş kod
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, code, newPassword } = body;

        const user = await prisma.user.findFirst({ where: { email } });
        if (!user) return ApiResponseHelper.error('Kullanıcı bulunamadı', 404);

        if (user.resetPasswordCode === code) {
            // Süre kontrolü (resetPasswordExpires > now)
            if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
                return ApiResponseHelper.error('Kodun süresi dolmuş', 400);
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetPasswordCode: null,
                    resetPasswordExpires: null
                }
            });

            return ApiResponseHelper.success({}, 'Şifre başarıyla değiştirildi');
        } else {
            return ApiResponseHelper.error('Hatalı kod', 400);
        }
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
