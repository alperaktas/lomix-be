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

        // Mevcut kullanıcının cinsiyetini al
        const currentUser = currentUserId ? await prisma.user.findUnique({
            where: { id: currentUserId },
            select: { gender: true },
        }) : null;

        // Karşı cinsiyeti belirle: erkek → kadın, kadın → erkek, bilinmiyorsa filtre yok
        const oppositeGender =
            currentUser?.gender === 'male' ? 'female' :
            currentUser?.gender === 'female' ? 'male' : null;

        const users = await prisma.user.findMany({
            where: {
                ...(currentUserId ? { id: { not: currentUserId } } : {}),
                role: "user",
                status: "active",
                ...(oppositeGender ? { gender: oppositeGender } : {}),
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
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

        // Fetch interactions for the current user to determine action_type
        const interactions = currentUserId ? await prisma.userInteraction.findMany({
            where: { userId: currentUserId, targetId: { in: users.map(u => u.id) } },
            select: { targetId: true, actionType: true },
        }) : [];
        const interactionMap = new Map(interactions.map(i => [i.targetId, i.actionType]));

        const responseData = users.length > 0 ? users.map(r => ({
            id: r.id,
            name: r.fullName || r.username,
            image_url: r.avatar?.trim() || `${new URL(request.url).origin}/img/default-avatar.svg`,
            is_vip: r.isVip || false,
            action_type: interactionMap.get(r.id) || "hi",
            level: r.level,
            score: r.prestigePoints,
            hakkimda: r.description || null,
        })) : fallback;

        return ApiResponseHelper.success(responseData, "Önerilen kullanıcılar listelendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
