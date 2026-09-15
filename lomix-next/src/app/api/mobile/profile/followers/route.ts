import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { USER_SELECT, formatUserRow, followingIdSet, readListParams, resolveTargetId } from '@/lib/profile-lists';

/**
 * @swagger
 * /api/mobile/profile/followers:
 *   get:
 *     summary: Takipçi listesi
 *     description: |
 *       `user_id` gönderilmezse token'daki kullanıcının takipçileri döner,
 *       gönderilirse o kullanıcının takipçileri. Her satırdaki `is_following`,
 *       **isteği yapan kullanıcının** o kişiyi takip edip etmediğini söyler —
 *       geri takip etme düğmesi bununla çizilebilir.
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
 *         description: Takipçiler başarıyla getirildi
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

        const rows = await prisma.userFollow.findMany({
            where: { followingId: targetId },
            orderBy: { createdAt: 'desc' },
            skip: params.offset,
            take: params.limit,
            include: { follower: { select: USER_SELECT } },
        });

        const followingSet = await followingIdSet(currentUserId, rows.map(r => r.followerId));

        const data = rows.map(r =>
            formatUserRow(r.follower, { isFollowing: followingSet.has(r.followerId), since: r.createdAt })
        );

        return ApiResponseHelper.success(data, "Takipçiler başarıyla getirildi");
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
