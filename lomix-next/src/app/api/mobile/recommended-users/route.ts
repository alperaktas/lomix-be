import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/recommended-users:
 *   get:
 *     summary: Önerilen kullanıcıları listele
 *     tags: [Mobile Social]
 *     responses:
 *       200:
 *         description: Kullanıcı listesi
 */
export async function GET() {
    return NextResponse.json([
        {
            "id": 1,
            "name": "Ayşe Yılmaz",
            "image_url": "https://i.pravatar.cc/150?img=32",
            "is_vip": true,
            "action_type": "hi"
        },
        {
            "id": 2,
            "name": "Mehmet Demir",
            "image_url": "https://i.pravatar.cc/150?img=44",
            "is_vip": true,
            "action_type": "hi"
        },
        {
            "id": 3,
            "name": "Zeynep Kaya",
            "image_url": "https://i.pravatar.cc/150?img=22",
            "is_vip": false,
            "action_type": "chatRoom"
        },
        {
            "id": 4,
            "name": "Ali Çelik",
            "image_url": "https://i.pravatar.cc/150?img=11",
            "is_vip": true,
            "action_type": "hi"
        },
        {
            "id": 5,
            "name": "Fatma Şahin",
            "image_url": "https://i.pravatar.cc/150?img=5",
            "is_vip": false,
            "action_type": "hi"
        }
    ]);
}
