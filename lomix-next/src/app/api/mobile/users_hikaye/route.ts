import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/users_hikaye:
 *   get:
 *     summary: Anasayfa Hikayeleri
 *     tags: [Mobile Stories]
 *     responses:
 *       200:
 *         description: Hikayesi Olan Kullanıcılar Listesi
 */
export async function GET() {
    return NextResponse.json({
        status: true,
        data: [
            {
                user_id: "001",
                username: "User 1",
                avatar_url: "/img/avatars/1.png",
                has_story: true
            },
            {
                user_id: "002",
                username: "User 2",
                avatar_url: "/img/avatars/2.png",
                has_story: true
            }
        ]
    });
}
