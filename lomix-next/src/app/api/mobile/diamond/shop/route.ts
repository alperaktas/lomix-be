import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/mobile/diamond/shop:
 *   post:
 *     summary: Elmas shop verilerini döndürür
 *     tags: [Mobile Diamond]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Elmas verisi gönderildi
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const userId = Number(body.user_id);

        if (!userId) {
            return ApiResponseHelper.error("Kullanıcı ID gerekli", 400);
        }

        const wallet = await prisma.wallet.findUnique({
            where: { userId },
        });

        const balance = wallet?.diamonds ?? 0;

        const shopItems = await prisma.diamondShopItem.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
        });

        const exchangeItems = shopItems
            .filter(item => item.type === 'exchange')
            .map(item => ({ coins: item.coins, diamonds: item.diamonds }));

        const withdrawItems = shopItems
            .filter(item => item.type === 'withdraw')
            .map(item => ({ diamonds: item.diamonds, coins: item.coins }));

        return ApiResponseHelper.success({
            balance,
            can_transfer: true,
            exchange_items: exchangeItems,
            withdraw_items: withdrawItems,
        }, "Elmas verisi gönderildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
