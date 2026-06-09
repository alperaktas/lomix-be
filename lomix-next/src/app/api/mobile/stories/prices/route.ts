import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/stories/prices:
 *   get:
 *     summary: Hikaye fiyat listesi
 *     tags: [Mobile Stories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fiyat listesi alındı.
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim", 401);

        const prices = await prisma.storyPrice.findMany({
            orderBy: { durationHours: 'asc' },
        });

        const defaults = [
            { id: 0, duration_hours: 6,  cost: 50,   label: "6 Saat" },
            { id: 0, duration_hours: 12, cost: 100,  label: "12 Saat" },
            { id: 0, duration_hours: 24, cost: 2000, label: "24 Saat" },
        ];

        const data = prices.length > 0
            ? prices.map(p => ({ id: p.id, duration_hours: p.durationHours, cost: p.cost, label: p.label }))
            : defaults;

        return ApiResponseHelper.success(data, "Fiyat listesi alındı.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
