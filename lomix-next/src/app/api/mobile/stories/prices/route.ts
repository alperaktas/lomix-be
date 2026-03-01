import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/stories/prices:
 *   get:
 *     summary: Hikaye süre/fiyat listesini getirir
 *     tags: [Mobile Stories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fiyat listesi alındı.
 */
export async function GET() {
    return NextResponse.json({
        success: true,
        message: "Fiyat listesi alındı.",
        data: [
            {
                duration_hours: 6,
                cost: 50,
                label: "6 Saat"
            },
            {
                duration_hours: 24,
                cost: 2000,
                label: "24 Saat"
            }
        ]
    });
}
