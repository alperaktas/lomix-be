import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/diamond/shop:
 *   post:
 *     summary: Elmas shop verilerini döndürür
 *     description: |
 *       Elmas bakiyesi ve admin panelinde tanımlı **aktif** paketler (`exchange_items`: elmas → coin bozdurma,
 *       `withdraw_items`: elmas çekim). Kullanıcı token'dan belirlenir; gövdedeki `user_id` verilirse token'daki
 *       kullanıcı olmalıdır (aksi halde 403). Paket yoksa listeler boş döner ve ilgili işlem yapılamaz.
 *     tags: [Mobile Diamond]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: Opsiyonel; verilirse token'daki kullanıcı olmalıdır
 *     responses:
 *       200:
 *         description: Elmas verisi gönderildi
 */
export async function POST(request: Request) {
    try {
        const authId = await getCurrentUserId(request);
        if (!authId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const body = await request.json().catch(() => ({}));
        // Yalnızca token'daki kullanıcının bakiyesi döner; gövdedeki user_id başkasını işaret edemez.
        const userId = Number(body.user_id ?? authId);
        if (userId !== authId) return ApiResponseHelper.error("Bu veriye erişim yetkiniz yok.", 403);

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
