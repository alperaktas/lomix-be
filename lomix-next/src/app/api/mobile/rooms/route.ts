import { ApiResponseHelper } from '@/lib/api-response';
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
    try {
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

        return ApiResponseHelper.success({
            banners: databaseBanners.length > 0 ? databaseBanners.map(b => ({
                id: b.id,
                title: b.title,
                image_url: b.imageUrl,
                action_url: b.actionUrl,
                background_colors: ["#1A237E", "#000000"]
            })) : [
                {
                    "id": 101,
                    "title": "Önemli Güncellemeler",
                    "image_url": "https://api.lomix.com/uploads/banner_update.png",
                    "action_url": "https://lomix.com/updates",
                    "background_colors": [
                        "#4A0000",
                        "#B71C1C"
                    ]
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
        }, "Odalar başarıyla getirildi.", 200, {
            current_page: page,
            total_pages: Math.ceil(totalCount / pageSize) || 1
        });
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
