import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/friends:
 *   post:
 *     summary: Kullanıcının arkadaşları
 *     tags: [Mobile Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Arkadaşlar başarıyla getirildi
 *       401:
 *         description: Yetkisiz erişim
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const origin = new URL(request.url).origin;

        const friendships = await prisma.userFriend.findMany({
            where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
            include: { user1: true, user2: true },
            orderBy: { createdAt: 'desc' },
        });

        const friends = friendships.map(f => {
            const friend = f.user1Id === userId ? f.user2 : f.user1;
            return {
                id: String(friend.id),
                name: friend.fullName || friend.username,
                avatar: friend.avatar?.trim() || `${origin}/img/default-avatar.svg`,
            };
        });

        return ApiResponseHelper.success(friends, "Arkadaşlar başarıyla getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
