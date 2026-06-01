import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/users/report:
 *   post:
 *     summary: Kullanıcıyı Şikayet Et
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Kullanıcı başarıyla şikayet edildi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { user_id, reason } = await request.json();
        if (!user_id) return ApiResponseHelper.error("user_id zorunludur.", 400);

        await prisma.userReport.create({
            data: { userId, reportedId: Number(user_id), reason: reason || null },
        });

        return ApiResponseHelper.success(null, "Kullanıcı başarıyla şikayet edildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
