import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/anlar/hot-topics:
 *   post:
 *     summary: Sıcak Konuları Getir
 *     tags: [Mobile Anlar]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sıcak konular getirildi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const topics = await prisma.anTopic.findMany({
            where: { isActive: true },
            select: { id: true, title: true, imageUrl: true },
            orderBy: { createdAt: 'desc' },
        });

        return ApiResponseHelper.success({
            topics: topics.map(t => ({
                id: String(t.id),
                title: t.title,
                url: t.imageUrl || '',
            })),
        }, "Sıcak konular getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
