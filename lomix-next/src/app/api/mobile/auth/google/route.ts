import { ApiResponseHelper } from '@/lib/api-response';
import { handleSocialAuth } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/mobile/auth/google:
 *   post:
 *     summary: Google ile giriş/kayıt
 *     tags: [Mobile Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *               deviceInfo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Giriş başarılı
 */
export async function POST(req: Request) {
    const result = await handleSocialAuth(req, 'google');

    if (result.error) {
        return ApiResponseHelper.error(result.error, result.status || 400);
    }
    return ApiResponseHelper.success(result.data, "Giriş başarılı.");
}
