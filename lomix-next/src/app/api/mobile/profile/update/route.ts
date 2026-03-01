import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/profile/update:
 *   post:
 *     summary: Profili Güncelle
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               bio:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profil Güncellendi
 */
export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        return NextResponse.json({
            status: true,
            message: "Profil başarıyla güncellendi."
        });
    } catch (error) {
        return NextResponse.json({ status: false, message: "Profil güncellenemedi." }, { status: 400 });
    }
}
