import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/anlar/like:
 *   post:
 *     summary: Anı Beğen
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
 *         description: An beğenildi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { an_id } = await request.json();
        if (!an_id) return ApiResponseHelper.error("an_id zorunludur.", 400);

        const anId = Number(an_id);
        await prisma.anLike.upsert({
            where: { anId_userId: { anId, userId } },
            create: { anId, userId },
            update: {},
        });

        return ApiResponseHelper.success(null, "An beğenildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
