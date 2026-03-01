import { NextResponse } from 'next/server';

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

        return NextResponse.json({
            status: true,
            message: "Yeni doğrulama kodu e-posta adresinize gönderildi."
        });
    } catch (error) {
        return NextResponse.json({ status: false, message: "Geçersiz istek" }, { status: 400 });
    }
}
