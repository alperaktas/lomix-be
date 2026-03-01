import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/ajans_total:
 *   get:
 *     summary: Toplam Yayıncılar
 *     tags: [Mobile Agency]
 *     responses:
 *       200:
 *         description: Tüm Ajans Kullanıcıları İstatistik/Listesi
 */
export async function GET() {
    return NextResponse.json({
        status: true,
        total_count: 145,
        data: []
    });
}
