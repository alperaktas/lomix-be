import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/anlar/available-tags:
 *   post:
 *     summary: Kullanılabilir Etiketleri Getir
 *     tags: [Mobile Anlar]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Etiketler getirildi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const tags = await prisma.anAvailableTag.findMany({
            orderBy: { name: 'asc' },
            select: { name: true },
        });

        return ApiResponseHelper.success({
            tags: tags.map(t => t.name),
        }, "Etiketler getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
