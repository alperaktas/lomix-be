import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

async function resolvePeriod(userId: number, month: number | null, year: number | null) {
    if (month && year) return { month, year };

    if (year && !month) {
        const rows = await prisma.$queryRaw<{ month: number }[]>(Prisma.sql`
            SELECT EXTRACT(MONTH FROM purchased_at)::int AS month
            FROM coin_purchases
            WHERE user_id = ${userId} AND EXTRACT(YEAR FROM purchased_at) = ${year}
            ORDER BY purchased_at DESC
            LIMIT 1
        `);
        if (!rows[0]) return null;
        return { month: rows[0].month, year };
    }

    if (month && !year) {
        const rows = await prisma.$queryRaw<{ year: number }[]>(Prisma.sql`
            SELECT EXTRACT(YEAR FROM purchased_at)::int AS year
            FROM coin_purchases
            WHERE user_id = ${userId} AND EXTRACT(MONTH FROM purchased_at) = ${month}
            ORDER BY purchased_at DESC
            LIMIT 1
        `);
        if (!rows[0]) return null;
        return { month, year: rows[0].year };
    }

    const latest = await prisma.coinPurchase.findFirst({
        where: { userId },
        orderBy: { purchasedAt: 'desc' },
        select: { purchasedAt: true },
    });
    if (!latest) return null;
    return { month: latest.purchasedAt.getUTCMonth() + 1, year: latest.purchasedAt.getUTCFullYear() };
}

/**
 * @swagger
 * /api/mobile/coin/purchase-history:
 *   post:
 *     summary: Kullanıcının aylık coin satın alma geçmişi
 *     tags: [Mobile Coin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: integer
 *               month:
 *                 type: integer
 *               year:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Coin satın alma geçmişi
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const userId = Number(body.user_id);
        if (!userId) return ApiResponseHelper.error("user_id zorunludur.", 400);

        const month = body.month ? Number(body.month) : null;
        const year = body.year ? Number(body.year) : null;

        const period = await resolvePeriod(userId, month, year);
        if (!period) {
            return ApiResponseHelper.success([], "Coin satın alma geçmişi bulunamadı.");
        }

        const start = new Date(Date.UTC(period.year, period.month - 1, 1));
        const end = new Date(Date.UTC(period.year, period.month, 1));

        const purchases = await prisma.coinPurchase.findMany({
            where: { userId, purchasedAt: { gte: start, lt: end } },
            orderBy: { purchasedAt: 'desc' },
        });

        const data = purchases.map(p => ({
            date: p.purchasedAt.toISOString().slice(0, 10),
            amount: p.amount,
            unit_price: p.unitPrice,
            total_price: p.totalPrice,
            tl_amount: p.tlAmount,
        }));

        const mm = String(period.month).padStart(2, '0');
        return ApiResponseHelper.success(data, `${mm} - ${period.year} ait coin geçmişi`);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
