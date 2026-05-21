import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/anlar/unlike-comment:
 *   post:
 *     summary: Yorum Beğenisini Kaldır
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
 *         description: Beğeni kaldırıldı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { comment_id } = await request.json();
        if (!comment_id) return ApiResponseHelper.error("comment_id zorunludur.", 400);

        await prisma.anCommentLike.deleteMany({
            where: { commentId: Number(comment_id), userId },
        });

        return ApiResponseHelper.success(null, "Beğeni kaldırıldı.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
