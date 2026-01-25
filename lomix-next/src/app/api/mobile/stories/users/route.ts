import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/stories/users:
 *   get:
 *     summary: Hikayesi olan kullanıcıları listele
 *     tags: [Mobile Stories]
 *     responses:
 *       200:
 *         description: Kullanıcı listesi
 */
export async function GET() {
    return NextResponse.json([
        {
            "id": 1,
            "first_name": "Ahmet",
            "last_name": "Yılmaz",
            "image_url": "https://i.pravatar.cc/300?img=11"
        },
        {
            "id": 2,
            "first_name": "Ayşe",
            "last_name": "Demir",
            "image_url": "https://i.pravatar.cc/300?img=5"
        },
        {
            "id": 3,
            "first_name": "Mehmet",
            "last_name": "Öztürk",
            "image_url": "https://i.pravatar.cc/300?img=3"
        },
        {
            "id": 4,
            "first_name": "Fatma",
            "last_name": "Kaya",
            "image_url": "https://i.pravatar.cc/300?img=9"
        },
        {
            "id": 5,
            "first_name": "Mustafa",
            "last_name": "Çelik",
            "image_url": "https://i.pravatar.cc/300?img=13"
        },
        {
            "id": 6,
            "first_name": "Zeynep",
            "last_name": "Şahin",
            "image_url": "https://i.pravatar.cc/300?img=24"
        },
        {
            "id": 7,
            "first_name": "Ali",
            "last_name": "Yıldız",
            "image_url": "https://i.pravatar.cc/300?img=68"
        },
        {
            "id": 8,
            "first_name": "Elif",
            "last_name": "Aydın",
            "image_url": "https://i.pravatar.cc/300?img=44"
        },
        {
            "id": 9,
            "first_name": "Burak",
            "last_name": "Arslan",
            "image_url": "https://i.pravatar.cc/300?img=53"
        },
        {
            "id": 10,
            "first_name": "Esra",
            "last_name": "Doğan",
            "image_url": "https://i.pravatar.cc/300?img=49"
        }
    ]);
}
