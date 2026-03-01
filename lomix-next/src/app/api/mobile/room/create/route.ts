import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/room/create:
 *   post:
 *     summary: Yeni Oda Oluştur
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               roomImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Oda Başarıyla Oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        return NextResponse.json({
            status: true,
            message: "Oda başarıyla oluşturuldu."
        });
    } catch (error) {
        return NextResponse.json({ status: false, message: "Oda oluşturulamadı." }, { status: 400 });
    }
}
