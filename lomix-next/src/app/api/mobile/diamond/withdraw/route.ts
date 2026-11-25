import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { isWalletBlocked, WALLET_BLOCK_MESSAGES } from '@/lib/wallet-guard';
import { withdrawFail } from '@/lib/withdrawal';

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
 *               method:
 *                 type: string
 *                 description: |
 *                   Çekim yönteminin adı (`diamond/withdrawal-center` → `withdraw_methods[].name`). Verilirse yeni akış çalışır:
 *                   miktar yöntemin min/max aralığında olmalı, talep "Beklemede" kaydedilir ve elmas hemen düşer
 *                   (reddedilirse iade edilir). Verilmezse eski sabit paket akışı geçerlidir.
 *     responses:
 *       200:
 *         description: Çekim talebi oluşturuldu (yeni akışta data.withdrawal_id, status)
 *       400:
 *         description: Geçersiz paket veya yetersiz bakiye (eski akış)
 *       403:
 *         description: WITHDRAW_BLOCKED
 *       422:
 *         description: Yeni akışta error_code INVALID_DIAMOND_AMOUNT, BELOW_MINIMUM, ABOVE_METHOD_LIMIT, INSUFFICIENT_BALANCE, WITHDRAW_METHOD_NOT_FOUND
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
        const methodName = typeof body.method === 'string' ? body.method.trim() : '';

        // Yeni akış: yöntem adıyla çekim talebi (sözleşme: diamond/withdrawal-center)
        if (methodName) return createWithdrawal(userId, diamondAmount, methodName);

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

/** Yöntemli çekim talebi: doğrulamalar sunucuda yeniden yapılır, elmas atomik düşer, kayıt "pending" açılır. */
async function createWithdrawal(userId: number, diamondAmount: number, methodName: string) {
    if (await isWalletBlocked(userId, 'withdraw')) {
        // Eski istemciler data.error_code okuyor; ikisi birlikte doluyor
        return withdrawFail(WALLET_BLOCK_MESSAGES.withdraw.message, 403, 'WITHDRAW_BLOCKED', true);
    }
    if (!Number.isInteger(diamondAmount) || diamondAmount <= 0) {
        return withdrawFail('Elmas miktarı pozitif bir tam sayı olmalıdır.', 422, 'INVALID_DIAMOND_AMOUNT');
    }

    const method = await prisma.withdrawMethod.findFirst({ where: { name: methodName, isActive: true } });
    if (!method) return withdrawFail('Seçilen çekim yöntemi bulunamadı.', 422, 'WITHDRAW_METHOD_NOT_FOUND');
    if (diamondAmount < method.minAmount) {
        return withdrawFail(`Bu yöntem için en az ${method.minAmount.toLocaleString('tr-TR')} elmas çekebilirsiniz.`, 422, 'BELOW_MINIMUM');
    }
    if (diamondAmount > method.maxAmount) {
        return withdrawFail(`Bu yöntem için en fazla ${method.maxAmount.toLocaleString('tr-TR')} elmas çekebilirsiniz.`, 422, 'ABOVE_METHOD_LIMIT');
    }

    class Insufficient extends Error {}
    try {
        const result = await prisma.$transaction(async tx => {
            // Koşullu düşüş: bakiye yetmiyorsa hiçbir şey yazılmaz (aynı anda iki istek bakiyeyi aşamaz)
            const taken = await tx.wallet.updateMany({
                where: { userId, diamonds: { gte: diamondAmount } },
                data: { diamonds: { decrement: diamondAmount } },
            });
            if (taken.count === 0) throw new Insufficient();

            const withdrawal = await tx.diamondWithdrawal.create({
                data: { userId, diamondAmount, methodName: method.name, status: 'pending' },
            });
            // diamond/data geçmişi bu kaydı da görsün
            await tx.diamondTransaction.create({ data: { userId, type: 'withdraw', diamondAmount } });
            const wallet = await tx.wallet.findUnique({ where: { userId }, select: { diamonds: true } });
            return { withdrawal, balance: wallet?.diamonds ?? 0 };
        });

        return ApiResponseHelper.success({
            balance: result.balance,
            diamond_amount: diamondAmount,
            withdrawal_id: String(result.withdrawal.id),
            status: 'Beklemede',
            method: method.name,
        }, 'Elmas çekim talebiniz alındı.');
    } catch (e) {
        if (e instanceof Insufficient) return withdrawFail('Yetersiz elmas bakiyesi.', 422, 'INSUFFICIENT_BALANCE');
        throw e;
    }
}
