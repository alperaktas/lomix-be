import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/mobile/rooms:
 *   get:
 *     summary: Canlı sesli odalar + bannerlar
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Sayfa numarası
 *     responses:
 *       200:
 *         description: Odalar başarıyla getirildi.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || "1", 10);
    const pageSize = 10;

    // Veritabanından canlı ("voice") odaları al
    const rooms = await prisma.room.findMany({
        where: {
            isLive: true,
            type: "voice" // Sadece sesli odalar
        },
        include: {
            owner: true,
            tags: true
        },
        skip: (page - 1) * pageSize,
        take: pageSize
    });

    const totalCount = await prisma.room.count({
        where: { isLive: true, type: "voice" }
    });

    // Banner'ları veritabanından al
    const databaseBanners = await prisma.roomBanner.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    return NextResponse.json({
        success: true,
        message: "Odalar başarıyla getirildi.",
        data: {
            banners: databaseBanners.length > 0 ? databaseBanners.map(b => ({
                id: b.id,
                title: b.title,
                image_url: b.imageUrl,
                action_url: b.actionUrl
            })) : [
                {
                    id: 101,
                    title: "Önemli Güncellemeler",
                    image_url: "https://api.lomix.com/uploads/banner.png",
                    action_url: "https://lomix.com/updates"
                }
            ],
            rooms: rooms.map(room => ({
                id: room.roomId,
                name: room.name,
                owner: {
                    id: String(room.ownerId),
                    name: room.owner?.fullName || room.owner?.username,
                    avatar_url: room.owner?.avatar || "https://i.pravatar.cc/150"
                },
                viewer_count: room.viewerCount,
                is_live: room.isLive,
                mode: room.mode,
                tags: room.tags.map(tag => ({
                    text: tag.text,
                    color_hex: tag.colorHex || "#000000"
                }))
            }))
        },
        meta: {
            current_page: page,
            total_pages: Math.ceil(totalCount / pageSize) || 1
        }
    });
}
