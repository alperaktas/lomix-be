import { ApiResponseHelper } from '@/lib/api-response';

/**
 * @swagger
 * /api/mobile/auth/resend-code:
 *   post:
 *     summary: Yeni OTP Kodu Gönderimi
 *     tags: [Mobile Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Yeni Kod Gönderildi
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        return ApiResponseHelper.success({}, "Yeni doğrulama kodu e-posta adresinize gönderildi.");
    } catch (error) {
        return ApiResponseHelper.error("Geçersiz istek", 400);
    }
}
