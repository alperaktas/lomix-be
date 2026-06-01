import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/messages/delete:
 *   post:
 *     summary: Mesaj Kutusunu Sil
 *     tags: [Mobile Chat]
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
 *                 type: integer
 *     responses:
 *       200:
 *         description: Mesaj kutusu başarıyla silindi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { user_id } = await request.json();
        if (!user_id) return ApiResponseHelper.error("user_id zorunludur.", 400);

        await prisma.conversation.upsert({
            where: { userId_otherUserId: { userId, otherUserId: Number(user_id) } },
            create: { userId, otherUserId: Number(user_id), isDeleted: true },
            update: { isDeleted: true },
        });

        return ApiResponseHelper.success(null, "Mesaj kutusu başarıyla silindi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
