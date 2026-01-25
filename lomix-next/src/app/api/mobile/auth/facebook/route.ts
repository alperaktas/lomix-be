import { NextResponse } from 'next/server';
import { handleSocialAuth } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/mobile/auth/facebook:
 *   post:
 *     summary: Facebook ile giriş/kayıt
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
 *                 description: Facebook Access Token
 *               deviceInfo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Giriş başarılı
 */
export async function POST(req: Request) {
    const result = await handleSocialAuth(req, 'facebook');

    if (result.error) {
        return NextResponse.json({ error_code: result.code, message: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data);
}
