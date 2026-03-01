import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/ajans_active:
 *   get:
 *     summary: Aktif Yayıncılar
 *     tags: [Mobile Agency]
 *     responses:
 *       200:
 *         description: Aktif Ajans Kullanıcıları Listesi
 */
export async function GET() {
    return NextResponse.json({
        status: true,
        data: [
            {
                user_id: "a_002",
                username: "Aktif Ajans 1",
                is_active: true
            }
        ]
    });
}
