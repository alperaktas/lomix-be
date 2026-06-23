import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/emojis/list:
 *   get:
 *     summary: Emoji listesi (kategoriye göre gruplu)
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

        const categories = await prisma.emojiCategory.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: {
                emojis: {
                    where: { isVisible: true },
                    orderBy: { order: 'asc' },
                    select: { id: true, name: true, imageUrl: true, svgaUrl: true, price: true },
                },
            },
        });

        return ApiResponseHelper.success(
            categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                emojis: cat.emojis.map(e => ({
                    id: e.id,
                    name: e.name,
                    image_url: e.imageUrl,
                    svga_url: e.svgaUrl || null,
                    price: e.price,
                })),
            })),
            "Emoji listesi getirildi."
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
