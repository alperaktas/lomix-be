import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { isWalletBlocked, WALLET_BLOCK_MESSAGES } from '@/lib/wallet-guard';

/**
 * @swagger
 * /api/mobile/diamond/withdraw:
 *   post:
 *     summary: Elmas çekim talebi oluştur
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
 *         description: Çekim talebi oluşturuldu
 *       400:
 *         description: Geçersiz paket veya yetersiz bakiye
 */
export async function POST(request: Request) {
    try {
        const authId = await getCurrentUserId(request);
        if (!authId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const body = await request.json();
        // İşlem yalnızca token'daki kullanıcı için yapılır; gövdedeki user_id başkasını işaret edemez.
        const userId = Number(body.user_id ?? authId);
        if (userId !== authId) return ApiResponseHelper.error("Bu işlem için yetkiniz yok.", 403);
        const diamondAmount = Number(body.diamond_amount);

        if (await isWalletBlocked(userId, 'withdraw')) {
            return ApiResponseHelper.error(WALLET_BLOCK_MESSAGES.withdraw.message, 403, { error_code: WALLET_BLOCK_MESSAGES.withdraw.errorCode });
        }

        if (!userId || !diamondAmount || diamondAmount <= 0) {
            return ApiResponseHelper.error("Kullanıcı ID ve elmas miktarı gerekli", 400);
        }

        const [wallet, shopItem] = await Promise.all([
            prisma.wallet.findUnique({ where: { userId } }),
            prisma.diamondShopItem.findFirst({
                where: { type: 'withdraw', diamonds: diamondAmount, isActive: true },
            }),
        ]);

        if (!shopItem) {
            return ApiResponseHelper.error("Geçersiz çekim paketi.", 400);
        }

        if ((wallet?.diamonds ?? 0) < diamondAmount) {
            return ApiResponseHelper.error("Yetersiz elmas bakiyesi.", 400);
        }

        const [updatedWallet] = await prisma.$transaction([
            prisma.wallet.update({
                where: { userId },
                data: { diamonds: { decrement: diamondAmount } },
            }),
            prisma.diamondTransaction.create({
                data: {
                    userId,
                    type: 'withdraw',
                    diamondAmount,
                },
            }),
        ]);

        return ApiResponseHelper.success({
            balance: updatedWallet.diamonds,
            diamond_amount: diamondAmount,
        }, "Elmas çekim talebi oluşturuldu.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
