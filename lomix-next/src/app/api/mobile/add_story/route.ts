import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/add_story:
 *   post:
 *     summary: Yeni Hikaye Ekle
 *     tags: [Mobile Stories]
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
 *               price:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Hikaye Başarıyla Eklendi
 */
export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        return NextResponse.json({
            status: true,
            message: "Hikaye eklendi."
        });
    } catch (error) {
        return NextResponse.json({ status: false, message: "Hikaye eklenemedi." }, { status: 400 });
    }
}
