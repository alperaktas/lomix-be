import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { orderedFriendPair } from '@/lib/profile-lists';

/**
 * @swagger
 * /api/mobile/profile/follow:
 *   post:
 *     summary: Kullanıcı takip et / takipten çık
 *     description: |
 *       Token'daki kullanıcı, `user_id` ile belirtilen kullanıcıyı takip eder veya takipten çıkar.
 *       İşlem tekrar edilebilir (idempotent): zaten takip edilen biri için tekrar `follow` gönderilirse
 *       yeni kayıt açılmaz, ilk takip tarihi korunur. Takip edilmeyen biri için `unfollow`
 *       hata değil, `is_following: false` ile başarı döner.
 *       Hata durumlarında da `data` gövdesi döner ve `error_code: FOLLOW_FAILED` içerir.
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: Hedef kullanıcının id değeri
 *               action:
 *                 type: string
 *                 enum: [follow, unfollow]
 *                 description: 'Varsayılan: follow'
 *     responses:
 *       200:
 *         description: Takip / takipten çıkma işlemi tamamlandı
 *       400:
 *         description: Eksik veya geçersiz parametre
 *       401:
 *         description: Yetkisiz erişim
 *       403:
 *         description: Engel nedeniyle takip edilemez
 *       404:
 *         description: Kullanıcı bulunamadı
 */
export async function POST(request: Request) {
    const followerId = await getCurrentUserId(request);
    if (!followerId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

    const body = await request.json().catch(() => ({}));
    const userIdRaw = body.user_id ?? body.userId;
    const action = String(body.action ?? 'follow').toLowerCase();

    // Hata yanitlarinda da mobilin bekledigi govde donuyor.
    const fail = (message: string, status: number, isFollowing = false) =>
        ApiResponseHelper.error(message, status, {
            success: false,
            is_following: isFollowing,
            user_id: userIdRaw !== undefined && userIdRaw !== null ? String(userIdRaw) : null,
            follower_id: String(followerId),
            error_code: 'FOLLOW_FAILED',
        });

    try {
        if (userIdRaw === undefined || userIdRaw === null || String(userIdRaw).trim() === '') {
            return fail("user_id zorunludur.", 400);
        }

        if (action !== 'follow' && action !== 'unfollow') {
            return fail("action yalnızca follow veya unfollow olabilir.", 400);
        }

        const targetId = Number(userIdRaw);
        if (isNaN(targetId)) return fail("Geçersiz user_id.", 400);

        if (targetId === followerId) {
            return fail("Kendinizi takip edemezsiniz.", 400);
        }

        const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
        if (!target) return fail("Kullanıcı bulunamadı.", 404);

        const existing = await prisma.userFollow.findUnique({
            where: { followerId_followingId: { followerId, followingId: targetId } },
        });

        const pair = orderedFriendPair(followerId, targetId);

        if (action === 'unfollow') {
            if (existing) {
                // Takip biterse karsiliklilik da biter; arkadaslik kaydi kalkar.
                await prisma.$transaction([
                    prisma.userFollow.delete({
                        where: { followerId_followingId: { followerId, followingId: targetId } },
                    }),
                    prisma.userFriend.deleteMany({ where: pair }),
                ]);
            }

            return ApiResponseHelper.success(
                {
                    success: true,
                    is_following: false,
                    is_friend: false,
                    user_id: String(targetId),
                    follower_id: String(followerId),
                    unfollowed_at: new Date().toISOString(),
                },
                "Takipten çıkma işlemi başarıyla tamamlandı"
            );
        }

        // Engel varsa takip kurulmuyor; takipten çıkma her durumda serbest.
        const block = await prisma.userBlock.findFirst({
            where: {
                OR: [
                    { userId: targetId, blockedId: followerId },
                    { userId: followerId, blockedId: targetId },
                ],
            },
        });
        if (block) {
            return fail("Engel nedeniyle bu kullanıcı takip edilemez.", 403);
        }

        const follow = existing ?? await prisma.userFollow.create({
            data: { followerId, followingId: targetId },
        });

        // Karsilikli takip = arkadaslik. Mesajlasma ucreti arkadaslar arasinda kalkiyor.
        const reverse = await prisma.userFollow.findUnique({
            where: { followerId_followingId: { followerId: targetId, followingId: followerId } },
        });

        let isFriend = false;
        if (reverse) {
            await prisma.userFriend.upsert({
                where: { user1Id_user2Id: pair },
                create: pair,
                update: {},
            });
            isFriend = true;
        }

        return ApiResponseHelper.success(
            {
                success: true,
                is_following: true,
                is_friend: isFriend,
                user_id: String(targetId),
                follower_id: String(followerId),
                followed_at: follow.createdAt.toISOString(),
            },
            "Kullanıcı başarıyla takip edildi"
        );
    } catch (error: any) {
        console.error("profile/follow error:", error);
        return fail("Takip işlemi gerçekleştirilemedi. Lütfen tekrar deneyin.", 500);
    }
}
