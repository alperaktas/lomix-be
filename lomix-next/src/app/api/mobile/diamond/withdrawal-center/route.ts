import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { isWalletBlocked } from '@/lib/wallet-guard';
import { WITHDRAWAL_STATUS_TEXT, getAmountOptions, withdrawFail } from '@/lib/withdrawal';

/** Ekran en fazla iki kayıt gösterir; biraz fazlasını veriyoruz. */
const HISTORY_LIMIT = 10;

/**
 * @swagger
 * /api/mobile/diamond/withdrawal-center:
 *   post:
 *     summary: Elmas çekim merkezi ekranı verileri
 *     description: |
 *       Kullanıcı Bearer token'dan belirlenir. Gövdedeki `user_id` isteğe bağlıdır; verilirse token sahibiyle aynı olmalıdır,
 *       değilse 403 `USER_MISMATCH`. Çekim yönetici tarafından kapatılmışsa 200 döner, `withdraw_blocked: true` ve
 *       `withdraw_methods: []` olur. Boş bakiye veya kayıt yokluğu hata değildir (200, boş alanlar).
 *       `withdrawals` en yeniden eskiye son 10 kayıttır; `status`: `Beklemede`, `Tamamlandı`, `Reddedildi`.
 *       Hatalarda üst düzey `error_code` döner: `UNAUTHENTICATED` (401), `USER_MISMATCH` (403), `INTERNAL_SERVER_ERROR` (500).
 *     tags: [Mobile Diamond]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: data.balance, withdraw_blocked, withdraw_methods[], amount_options[], withdrawals[]
 *       401:
 *         description: UNAUTHENTICATED
 *       403:
 *         description: USER_MISMATCH
 */
export async function POST(request: Request) {
    try {
        const authId = await getCurrentUserId(request);
        if (!authId) return withdrawFail('İstek için oturum açmanız gerekiyor.', 401, 'UNAUTHENTICATED');

        // Gövde isteğe bağlı: boş ya da bozuksa kullanıcı token'dan alınır
        const body = await request.json().catch(() => ({}));
        const rawId = body?.user_id;
        if (rawId !== undefined && rawId !== null && rawId !== '' && Number(rawId) !== authId) {
            return withdrawFail('Bu veriye erişim yetkiniz yok.', 403, 'USER_MISMATCH');
        }

        const blocked = await isWalletBlocked(authId, 'withdraw');
        const [wallet, methods, options, withdrawals] = await Promise.all([
            prisma.wallet.findUnique({ where: { userId: authId }, select: { diamonds: true } }),
            blocked
                ? Promise.resolve([])
                : prisma.withdrawMethod.findMany({ where: { isActive: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }] }),
            getAmountOptions(),
            prisma.diamondWithdrawal.findMany({
                where: { userId: authId },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: HISTORY_LIMIT,
            }),
        ]);

        return NextResponse.json({
            status: true,
            success: true,
            message: 'Elmas çekim merkezi verileri getirildi.',
            data: {
                balance: wallet?.diamonds ?? 0,
                withdraw_blocked: blocked,
                withdraw_methods: methods.map(m => ({
                    id: m.id,
                    name: m.name,
                    description: m.description,
                    min_amount: m.minAmount,
                    max_amount: m.maxAmount,
                    requires_bank_info: m.requiresBankInfo,
                })),
                amount_options: options,
                withdrawals: withdrawals.map(w => ({
                    diamond_amount: w.diamondAmount,
                    date: w.createdAt.toISOString(),
                    status: WITHDRAWAL_STATUS_TEXT[w.status] ?? w.status,
                    method: w.methodName,
                    description: w.description ?? '',
                })),
            },
        });
    } catch (error: any) {
        console.error('diamond/withdrawal-center error:', error);
        return withdrawFail('Beklenmeyen bir hata oluştu.', 500, 'INTERNAL_SERVER_ERROR');
    }
}
