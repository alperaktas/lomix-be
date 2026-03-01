import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/recommended_users:
 *   get:
 *     summary: Anasayfa Önerilen Kullanıcılar
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı Listesi
 */
export async function GET() {
    return NextResponse.json({
        status: true,
        data: [
            { id: 1, username: "Önerilmiş Kullanıcı 1", profileImage: "/img/avatars/1.png" },
            { id: 2, username: "Önerilmiş Kullanıcı 2", profileImage: "/img/avatars/2.png" }
        ]
    });
}
