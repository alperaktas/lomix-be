import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/emojis/detail:
 *   get:
 *     summary: Emoji detayı
 *     tags: [Mobile Emojis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Emoji detayı döndürüldü
 *       404:
 *         description: Emoji bulunamadı
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { searchParams } = new URL(request.url);
        const id = Number(searchParams.get('id'));
        if (!id) return ApiResponseHelper.error("id zorunludur.", 400);

        const emoji = await prisma.emoji.findUnique({ where: { id } });
        if (!emoji) return ApiResponseHelper.error("Emoji bulunamadı.", 404);

        return ApiResponseHelper.success({
            id: emoji.id,
            name: emoji.name,
            image_url: emoji.imageUrl,
            svga_url: emoji.svgaUrl || null,
            order: emoji.order,
        }, "Emoji detayı getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
