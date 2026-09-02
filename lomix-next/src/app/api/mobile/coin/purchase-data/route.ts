import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

const PAYMENT_METHODS = [
    { type: 'credit_card', label: 'Kredi Kartı ile Ödeme' },
    { type: 'gpay', label: 'GPay' },
    { type: 'wire_transfer', label: 'Havale/EFT ile Ödeme' },
];

function formatPrice(price: number, currency: string): string {
    try {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(price);
    } catch {
        return `${price.toFixed(2)} ${currency}`;
    }
}

/**
 * @swagger
 * /api/mobile/coin/purchase-data:
 *   post:
 *     summary: Coin bakiyesi ve satın alınabilir coin paketleri
 *     tags: [Mobile Coin]
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
 *         description: Coin satın alma verisi gönderildi
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const userId = Number(body.user_id);

        if (!userId) {
            return ApiResponseHelper.error("Kullanıcı ID gerekli", 400);
        }

        const [wallet, packages] = await Promise.all([
            prisma.wallet.findUnique({ where: { userId } }),
            prisma.coinPackage.findMany({
                where: { isActive: true },
                orderBy: { order: 'asc' },
            }),
        ]);

        const balance = wallet?.balance ?? 0;

        return ApiResponseHelper.success({
            balance,
            banner: {
                image_url: "assets/images/gold_coin.webp",
                link_url: null,
                title: "Haftanın Fırsatı!",
            },
            packages: packages.map(p => ({
                base: p.coinAmount,
                bonus: p.bonusAmount > 0 ? p.bonusAmount : null,
                price: formatPrice(p.price, p.currency),
                asset_image: "assets/images/gold_coin.webp",
                badge: p.badgeText ?? null,
            })),
            payment_methods: PAYMENT_METHODS,
        }, "Coin satın alma verisi gönderildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
