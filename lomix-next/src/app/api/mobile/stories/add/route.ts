import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/stories/add:
 *   post:
 *     summary: Yeni hikaye ekle
 *     tags: [Mobile Stories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               duration: { type: integer, example: 24 }
 *     responses:
 *       200:
 *         description: Başarılı
 */
export async function POST() {
    return NextResponse.json({
        "success": true,
        "message": "Hikaye başarıyla eklendi"
    });
}
