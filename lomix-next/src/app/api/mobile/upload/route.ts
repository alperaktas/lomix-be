import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/upload:
 *   post:
 *     summary: Medya Yükleme (Genel)
 *     tags: [Mobile Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Dosya Başarıyla Yüklendi
 */
export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        return NextResponse.json({
            status: true,
            message: "Dosya başarıyla yüklendi.",
            url: "/uploads/example.png"
        });
    } catch (error) {
        return NextResponse.json({ status: false, message: "Dosya yüklenemedi." }, { status: 400 });
    }
}
