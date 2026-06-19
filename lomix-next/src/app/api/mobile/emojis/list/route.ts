import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/emojis/list:
 *   get:
 *     summary: Emoji listesi
 *     tags: [Mobile Emojis]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Emoji listesi döndürüldü
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const emojis = await prisma.emoji.findMany({
            where: { isVisible: true },
            orderBy: { order: 'asc' },
        });

        return ApiResponseHelper.success(
            emojis.map(e => ({
                id: e.id,
                name: e.name,
                image_url: e.imageUrl,
                svga_url: e.svgaUrl || null,
                order: e.order,
            })),
            "Emoji listesi getirildi."
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
