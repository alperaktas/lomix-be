import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/mobile/diamond/exchange:
 *   post:
 *     summary: Elmasları coin ile bozdur
 *     tags: [Mobile Diamond]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - diamond_amount
 *             properties:
 *               user_id:
 *                 type: integer
 *               diamond_amount:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Bozdurma işlemi tamamlandı
 *       400:
 *         description: Geçersiz paket veya yetersiz bakiye
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const userId = Number(body.user_id);
        const diamondAmount = Number(body.diamond_amount);

        if (!userId || !diamondAmount || diamondAmount <= 0) {
            return ApiResponseHelper.error("Kullanıcı ID ve elmas miktarı gerekli", 400);
        }

        const [wallet, shopItem] = await Promise.all([
            prisma.wallet.findUnique({ where: { userId } }),
            prisma.diamondShopItem.findFirst({
                where: { type: 'exchange', diamonds: diamondAmount, isActive: true },
            }),
        ]);

        if (!shopItem) {
            return ApiResponseHelper.error("Geçersiz bozdurma paketi.", 400);
        }

        if ((wallet?.diamonds ?? 0) < diamondAmount) {
            return ApiResponseHelper.error("Yetersiz elmas bakiyesi.", 400);
        }

        const coinValue = shopItem.coins;

        const [updatedWallet] = await prisma.$transaction([
            prisma.wallet.update({
                where: { userId },
                data: {
                    diamonds: { decrement: diamondAmount },
                    balance: { increment: coinValue },
                },
            }),
            prisma.diamondTransaction.create({
                data: {
                    userId,
                    type: 'exchange',
                    diamondAmount,
                    coinValue,
                },
            }),
        ]);

        return ApiResponseHelper.success({
            balance: updatedWallet.diamonds,
            coin_balance: updatedWallet.balance,
            diamond_amount: diamondAmount,
            coin_value: coinValue,
        }, "Elmaslar coin ile bozduruldu.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
