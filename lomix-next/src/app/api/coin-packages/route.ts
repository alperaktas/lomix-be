import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const packages = await prisma.coinPackage.findMany({ orderBy: { order: 'asc' } });
        return ApiResponseHelper.success(packages, 'Coin paketleri getirildi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function PATCH(req: Request) {
    try {
        const items: { id: number; order: number }[] = await req.json();
        await prisma.$transaction(
            items.map(({ id, order }) => prisma.coinPackage.update({ where: { id }, data: { order } }))
        );
        return ApiResponseHelper.success(null, 'Sıralama güncellendi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function POST(req: Request) {
    try {
        const { name, coinAmount, bonusAmount, price, currency, badgeText, isActive, isFeatured, order } = await req.json();
        if (!name || !coinAmount || price === undefined) {
            return ApiResponseHelper.error('name, coinAmount ve price zorunludur.', 400);
        }
        const pkg = await prisma.coinPackage.create({
            data: {
                name,
                coinAmount: Number(coinAmount),
                bonusAmount: Number(bonusAmount ?? 0),
                price: Number(price),
                currency: currency || 'TRY',
                badgeText: badgeText || null,
                isActive: isActive !== false,
                isFeatured: !!isFeatured,
                order: order ?? 0,
            },
        });
        return ApiResponseHelper.success(pkg, 'Paket oluşturuldu.', 201);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
