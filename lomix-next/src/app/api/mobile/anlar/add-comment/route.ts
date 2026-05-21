import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getAnTime } from '@/lib/an-time';

/**
 * @swagger
 * /api/mobile/anlar/add-comment:
 *   post:
 *     summary: Yorum Ekle
 *     tags: [Mobile Anlar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [an_id, text]
 *             properties:
 *               an_id:
 *                 type: string
 *               text:
 *                 type: string
 *               parent_comment_id:
 *                 type: string
 *                 description: Yanıt için üst yorum ID
 *     responses:
 *       200:
 *         description: Yorum eklendi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { an_id, text, parent_comment_id } = await request.json();
        if (!an_id || !text?.trim()) return ApiResponseHelper.error("an_id ve text zorunludur.", 400);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { fullName: true, username: true, avatar: true },
        });

        const comment = await prisma.anComment.create({
            data: {
                anId: Number(an_id),
                userId,
                text: text.trim(),
                parentId: parent_comment_id ? Number(parent_comment_id) : null,
            },
        });

        return ApiResponseHelper.success({
            id: String(comment.id),
            userId: String(userId),
            userName: user?.fullName || user?.username || '',
            userAvatar: user?.avatar || '',
            text: comment.text,
            createdAt: getAnTime(comment.createdAt),
            likeCount: 0,
            isLiked: false,
            replyCount: 0,
            replies: [],
        }, "Yorum eklendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
