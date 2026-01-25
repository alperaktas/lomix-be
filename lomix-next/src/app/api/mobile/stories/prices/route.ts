import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/stories/prices:
 *   get:
 *     summary: Hikaye fiyatlarını getir
 *     tags: [Mobile Stories]
 *     responses:
 *       200:
 *         description: Fiyat listesi
 */
export async function GET() {
    return NextResponse.json([
        {
            "duration": 6,
            "cost": 50,
            "label": "6 saat"
        },
        {
            "duration": 12,
            "cost": 100,
            "label": "12 saat"
        },
        {
            "duration": 24,
            "cost": 2000,
            "label": "24 saat"
        }
    ]);
}
