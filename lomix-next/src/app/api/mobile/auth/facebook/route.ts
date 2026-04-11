import { ApiResponseHelper } from '@/lib/api-response';
import { handleSocialAuth } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/mobile/auth/facebook:
 *   post:
 *     summary: Facebook ile giriş/kayıt
...
 */
export async function POST(req: Request) {
    const result = await handleSocialAuth(req, 'facebook');

    if (result.error) {
        return ApiResponseHelper.error(result.error, result.status || 400);
    }
    return ApiResponseHelper.success(result.data, "Giriş başarılı.");
}
