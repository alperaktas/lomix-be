import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { USER_SELECT, formatUserRow, followingIdSet, friendIdSet, readListParams, resolveTargetId } from '@/lib/profile-lists';

/**
 * @swagger
 * /api/mobile/profile/friends:
 *   get:
 *     summary: Arkadaş listesi
 *     description: |
 *       `user_friends` tablosundan arkadaş listesi. Kayıt çift yönlü tutulduğu için
 *       (user1/user2) her iki taraftaki eşleşmeler birleştirilip karşı taraftaki kişi döner.
 *       `user_id` gönderilmezse token'daki kullanıcının arkadaşları döner.
 *       Mevcut `POST /api/mobile/friends` ucu daha dar bir gövde (id/name/avatar) döndürüyor
 *       ve olduğu gibi duruyor; bu uç ise diğer profil listeleriyle aynı biçimde yanıt verir.
 *       Aynı uç POST ile de çağrılabilir (parametreler gövdeden okunur).
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *         description: 'Varsayılan 100, en fazla 200'
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Arkadaşlar başarıyla getirildi
 *       400:
 *         description: Geçersiz user_id
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Kullanıcı bulunamadı
 */
async function handle(request: Request) {
    try {
        const currentUserId = await getCurrentUserId(request);
        if (!currentUserId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const params = await readListParams(request);
        const targetId = resolveTargetId(currentUserId, params.userId);
        if (targetId === null) return ApiResponseHelper.error("Geçersiz user_id.", 400);

        if (targetId !== currentUserId) {
            const exists = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
            if (!exists) return ApiResponseHelper.error("Kullanıcı bulunamadı.", 404);
        }

        const rows = await prisma.userFriend.findMany({
            where: { OR: [{ user1Id: targetId }, { user2Id: targetId }] },
            orderBy: { createdAt: 'desc' },
            skip: params.offset,
            take: params.limit,
            include: {
                user1: { select: USER_SELECT },
                user2: { select: USER_SELECT },
            },
        });

        const friends = rows.map(r => ({
            user: r.user1Id === targetId ? r.user2 : r.user1,
            since: r.createdAt,
        }));

        const ids = friends.map(f => f.user.id);
        const [followingSet, friendSet] = await Promise.all([
            followingIdSet(currentUserId, ids),
            friendIdSet(currentUserId, ids),
        ]);

        const data = friends.map(f =>
            formatUserRow(f.user, {
                isFollowing: followingSet.has(f.user.id),
                isFriend: friendSet.has(f.user.id),
                since: f.since,
            })
        );

        return ApiResponseHelper.success(data, "Arkadaşlar başarıyla getirildi");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function GET(request: Request) {
    return handle(request);
}

export async function POST(request: Request) {
    return handle(request);
}
