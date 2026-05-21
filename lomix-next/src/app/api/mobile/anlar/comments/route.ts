import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getAnTime } from '@/lib/an-time';

/**
 * @swagger
 * /api/mobile/anlar/comments:
 *   post:
 *     summary: An Yorumlarını Getir
 *     tags: [Mobile Anlar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [an_id]
 *             properties:
 *               an_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Yorumlar getirildi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { an_id } = await request.json();
        if (!an_id) return ApiResponseHelper.error("an_id zorunludur.", 400);

        const comments = await prisma.anComment.findMany({
            where: { anId: Number(an_id), parentId: null },
            orderBy: { createdAt: 'asc' },
            include: {
                user: { select: { id: true, fullName: true, username: true, avatar: true } },
                likes: { select: { userId: true } },
                replies: {
                    include: {
                        user: { select: { id: true, fullName: true, username: true, avatar: true } },
                        likes: { select: { userId: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        return ApiResponseHelper.success({
            comments: comments.map(c => ({
                id: String(c.id),
                userId: String(c.userId),
                userName: c.user.fullName || c.user.username,
                userAvatar: c.user.avatar || '',
                text: c.text,
                createdAt: getAnTime(c.createdAt),
                likeCount: c.likes.length,
                isLiked: c.likes.some(l => l.userId === userId),
                replyCount: c.replies.length,
                replies: c.replies.map(r => ({
                    id: String(r.id),
                    userId: String(r.userId),
                    userName: r.user.fullName || r.user.username,
                    userAvatar: r.user.avatar || '',
                    text: r.text,
                    createdAt: getAnTime(r.createdAt),
                    likeCount: r.likes.length,
                    isLiked: r.likes.some(l => l.userId === userId),
                })),
            })),
        }, "Yorumlar getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
