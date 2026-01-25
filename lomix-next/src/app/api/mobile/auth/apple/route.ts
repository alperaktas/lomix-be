import { NextResponse } from 'next/server';
import { handleSocialAuth } from '@/lib/auth-helpers';

/**
 * @swagger
 * /api/mobile/auth/apple:
 *   post:
 *     summary: Apple ile giriş/kayıt
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
 *                 description: Apple ID Token
 *               deviceInfo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Giriş başarılı
 */
export async function POST(req: Request) {
    const result = await handleSocialAuth(req, 'apple');

    if (result.error) {
        return NextResponse.json({ error_code: result.code, message: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data);
}
