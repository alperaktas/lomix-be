import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/story_prices:
 *   get:
 *     summary: Hikaye Ücretleri Listesi
 *     tags: [Mobile Stories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tutar Listesi
 */
export async function GET() {
    return NextResponse.json({
        status: true,
        data: [
            { duration: 6, cost: 50 },
            { duration: 12, cost: 100 },
            { duration: 24, cost: 200 }
        ]
    });
}
