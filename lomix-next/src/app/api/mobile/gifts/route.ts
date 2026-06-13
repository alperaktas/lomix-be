import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/gifts:
 *   get:
 *     summary: Hediye listesi (kategoriye göre gruplu)
 *     tags: [Mobile Gifts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hediyeler başarıyla getirildi
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
        }

        const categories = await prisma.giftCategory.findMany({
            where: { isActive: true },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            include: {
                gifts: {
                    where: { isVisible: true },
                    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                },
            },
        });

        const data = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            gifts: cat.gifts.map(g => ({
                id: g.id,
                name: g.name,
                image_url: g.imageUrl,
                svga_url: g.svgaUrl || null,
                price: g.price,
            })),
        }));

        return NextResponse.json({ status: true, message: 'Hediyeler getirildi', data });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
