import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const pkg = await prisma.coinPackage.update({
            where: { id: Number(id) },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.coinAmount !== undefined && { coinAmount: Number(body.coinAmount) }),
                ...(body.bonusAmount !== undefined && { bonusAmount: Number(body.bonusAmount) }),
                ...(body.price !== undefined && { price: Number(body.price) }),
                ...(body.currency !== undefined && { currency: body.currency }),
                ...(body.badgeText !== undefined && { badgeText: body.badgeText || null }),
                ...(body.isActive !== undefined && { isActive: body.isActive }),
                ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
                ...(body.order !== undefined && { order: Number(body.order) }),
            },
        });
        return ApiResponseHelper.success(pkg, 'Paket güncellendi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.coinPackage.delete({ where: { id: Number(id) } });
        return ApiResponseHelper.success(null, 'Paket silindi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
