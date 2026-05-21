import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/anlar/sil:
 *   post:
 *     summary: Anı Sil
 *     tags: [Mobile Anlar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: An silindi
 *       403:
 *         description: Yetkisiz
 *       404:
 *         description: An bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { id } = await request.json();
        if (!id) return ApiResponseHelper.error("id zorunludur.", 400);

        const an = await prisma.an.findUnique({ where: { id: Number(id) } });
        if (!an) return ApiResponseHelper.error("An bulunamadı.", 404);
        if (an.userId !== userId) return ApiResponseHelper.error("Bu anı silme yetkiniz yok.", 403);

        await prisma.an.delete({ where: { id: an.id } });

        return ApiResponseHelper.success(null, "An silindi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
