import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/mobile/rooms/video:
 *   get:
 *     summary: Canlı video odaları
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Video odaları başarıyla getirildi.
 */
export async function GET() {
    try {
        const videoRooms = await prisma.room.findMany({
            where: {
                isLive: true,
                type: "video" // Sadece video odaları
            },
            include: {
                tags: true,
                owner: true
            },
            orderBy: {
                viewerCount: 'desc'
            },
            take: 20
        });

        return ApiResponseHelper.success({
            banners: [
                {
                    "id": 201,
                    "title": "Video Gecesi Etkinliği",
                    "image_url": "https://admin.lomixlive.com:3000/uploads/banner_video.png",
                    "background_colors": [
                        "#1A237E",
                        "#000000"
                    ]
                }
            ],
            rooms: videoRooms.map(room => ({
                id: room.roomId,
                name: room.name,
                thumbnail_url: room.thumbnailUrl || "https://picsum.photos/400/200",
                min_level: room.minLevel || 1,
                type: room.type,
                tags: room.tags.map(tag => ({
                    text: tag.text,
                    color_hex: tag.colorHex || "#000000"
                }))
            }))
        }, "Video odaları başarıyla getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
