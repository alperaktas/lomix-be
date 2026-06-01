import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/users/update-action:
 *   post:
 *     summary: Kullanıcı Aksiyonunu Güncelle
 *     description: Hi butonuna basılınca hedef kullanıcıyla action_type'ı chatRoom yapar
 *     tags: [Mobile Users]
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
 *         description: Aksiyon güncellendi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { user_id } = await request.json();
        if (!user_id) return ApiResponseHelper.error("user_id zorunludur.", 400);

        const targetId = Number(user_id);

        const interaction = await prisma.userInteraction.upsert({
            where: { userId_targetId: { userId, targetId } },
            create: { userId, targetId, actionType: 'chatRoom' },
            update: { actionType: 'chatRoom' },
        });

        return ApiResponseHelper.success({
            user_id: targetId,
            action_type: interaction.actionType,
            updated_at: interaction.updatedAt,
        }, "Kullanıcı aksiyonu başarıyla güncellendi");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
