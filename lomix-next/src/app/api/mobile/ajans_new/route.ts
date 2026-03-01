import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/ajans_new:
 *   get:
 *     summary: Yeni Yayıncılar
 *     tags: [Mobile Agency]
 *     responses:
 *       200:
 *         description: Yeni Ajans Kullanıcıları Listesi
 */
export async function GET() {
    return NextResponse.json({
        status: true,
        data: [
            {
                user_id: "a_001",
                username: "Yeni Ajans 1",
                join_date: "2024-05-12"
            }
        ]
    });
}
