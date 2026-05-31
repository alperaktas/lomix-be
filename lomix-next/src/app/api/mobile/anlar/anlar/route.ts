import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getAnTime } from '@/lib/an-time';

const VALID_CATEGORIES = ['Takip Edilen', 'Keşfet', 'Benim'] as const;

/**
 * @swagger
 * /api/mobile/anlar/anlar:
 *   post:
 *     summary: Anları Listele
 *     tags: [Mobile Anlar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [Takip Edilen, Keşfet, Benim]
 *               topic_id:
 *                 type: string
 *                 description: Hot topic ID - kategori ile OR olarak birleştirilir
 *     responses:
 *       200:
 *         description: Anlar getirildi
 *       400:
 *         description: Geçersiz kategori
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { category, topic_id } = await request.json();

        if (category && !VALID_CATEGORIES.includes(category)) {
            return ApiResponseHelper.error(
                `Geçersiz kategori. Geçerli değerler: ${VALID_CATEGORIES.join(', ')}`,
                400
            );
        }

        // Build category filter
        let categoryWhere: any = null;
        if (category === 'Takip Edilen') {
            const follows = await prisma.userFollow.findMany({
                where: { followerId: userId },
                select: { followingId: true },
            });
            const followingIds = follows.map(f => f.followingId);
            categoryWhere = { userId: { in: followingIds } };
        } else if (category === 'Benim') {
            categoryWhere = { userId };
        }
        // 'Keşfet' or no category = no filter

        // Build topic filter
        const topicWhere: any = topic_id ? { topicId: Number(topic_id) } : null;

        // Combine with OR when both are present, otherwise use whichever exists
        let where: any = {};
        if (categoryWhere && topicWhere) {
            where = { OR: [categoryWhere, topicWhere] };
        } else if (categoryWhere) {
            where = categoryWhere;
        } else if (topicWhere) {
            where = topicWhere;
        }

        const anlar = await prisma.an.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                user: { select: { id: true, fullName: true, username: true, avatar: true, level: true } },
                tags: { select: { tag: true } },
                likes: { select: { userId: true } },
                hiLikes: { select: { userId: true } },
                _count: { select: { comments: true } },
            },
        });

        return ApiResponseHelper.success({
            anlar: anlar.map(an => ({
                id: String(an.id),
                name: an.user.fullName || an.user.username,
                anTime: getAnTime(an.createdAt),
                imageUrl: an.user.avatar || '',
                actionType: an.actionType,
                likeCount: an.likes.length,
                messageCount: an._count.comments,
                tag: an.tags[0]?.tag || '',
                anPictureUrl: an.imageUrl || '',
                description: an.description || '',
                lvl: an.user.level,
                isLiked: an.likes.some(l => l.userId === userId),
                isHiLiked: an.hiLikes.some(l => l.userId === userId),
            })),
        }, "Anlar getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
