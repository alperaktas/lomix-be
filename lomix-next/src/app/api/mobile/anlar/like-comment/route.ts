import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/anlar/like-comment:
 *   post:
 *     summary: Yorumu Beğen
 *     tags: [Mobile Anlar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [comment_id]
 *             properties:
 *               comment_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Yorum beğenildi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { comment_id } = await request.json();
        if (!comment_id) return ApiResponseHelper.error("comment_id zorunludur.", 400);

        const commentId = Number(comment_id);
        await prisma.anCommentLike.upsert({
            where: { commentId_userId: { commentId, userId } },
            create: { commentId, userId },
            update: {},
        });

        return ApiResponseHelper.success(null, "Yorum beğenildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
