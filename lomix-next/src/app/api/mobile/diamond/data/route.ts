import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/mobile/diamond/data:
 *   post:
 *     summary: Elmas bakiyesi ve geçmiş bozdurma/çekim işlemlerini döndürür
 *     tags: [Mobile Diamond]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
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

        const [wallet, transactions] = await Promise.all([
            prisma.wallet.findUnique({ where: { userId } }),
            prisma.diamondTransaction.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const balance = wallet?.diamonds ?? 0;

        const exchanges = transactions
            .filter(t => t.type === 'exchange')
            .map(t => ({
                diamond_amount: t.diamondAmount,
                coin_value: t.coinValue ?? 0,
                date: t.createdAt.toISOString().split('T')[0],
            }));

        const withdrawals = transactions
            .filter(t => t.type === 'withdraw')
            .map(t => ({
                diamond_amount: t.diamondAmount,
                date: t.createdAt.toISOString().split('T')[0],
            }));

        return ApiResponseHelper.success({
            balance,
            exchanges,
            withdrawals,
        }, "Elmas verisi gönderildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
