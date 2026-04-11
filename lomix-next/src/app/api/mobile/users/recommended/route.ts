import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/users/recommended:
 *   get:
 *     summary: Takip / arkadaş önerileri
 *     tags: [Mobile Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Önerilen kullanıcılar listelendi.
 */
export async function GET(request: Request) {
    try {
        const currentUserId = await getCurrentUserId(request);

        // Veritabanından önerilen kullanıcıları al
        const users = await prisma.user.findMany({
            where: currentUserId ? {
                id: { not: currentUserId },
                role: "user",
                status: "active"
            } : {
                role: "user",
                status: "active"
            },
            take: 10,
            orderBy: {
                createdAt: 'desc'
            }
        });

        const fallback = [
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
        ];

        const responseData = users.length > 0 ? users.map(r => ({
            id: r.id,
            name: r.fullName || r.username,
            image_url: r.avatar || "https://i.pravatar.cc/150",
            is_vip: r.isVip || false,
            action_type: "hi" // Varsayılan aksiyon tipi
        })) : fallback;

        return ApiResponseHelper.success(responseData, "Önerilen kullanıcılar listelendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
