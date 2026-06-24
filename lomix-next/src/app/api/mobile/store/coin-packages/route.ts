import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/mobile/store/coin-packages:
 *   get:
 *     summary: Aktif coin paketleri listesi
 *     tags: [Mobile Store]
 *     responses:
 *       200:
 *         description: Coin paketleri döndürüldü
 */
export async function GET() {
    try {
        const packages = await prisma.coinPackage.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
            select: { id: true, name: true, coinAmount: true, bonusAmount: true, price: true, currency: true, badgeText: true, isFeatured: true },
        });

        return ApiResponseHelper.success(
            packages.map(p => ({
                id: p.id,
                name: p.name,
                coin_amount: p.coinAmount,
                bonus_amount: p.bonusAmount,
                price: p.price,
                currency: p.currency,
                badge_text: p.badgeText ?? null,
                is_featured: p.isFeatured,
            })),
            'Coin paketleri getirildi.'
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
