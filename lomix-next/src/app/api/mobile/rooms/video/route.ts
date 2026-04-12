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

        let finalRooms = videoRooms.map(room => ({
            id: room.roomId,
            name: room.name,
            thumbnail_url: room.thumbnailUrl || "https://picsum.photos/400/200",
            min_level: room.minLevel || 1,
            type: room.type,
            tags: room.tags.map(tag => ({
                text: tag.text,
                color_hex: tag.colorHex || "#000000"
            }))
        }));

        // Eğer oda yoksa 5 tane random mock oda dön
        if (finalRooms.length === 0) {
            const mockNames = ["Sohbet Odası", "Eğlence Vakti", "Canlı Yayın", "Gece Muhabbeti", "Yeni Dostluklar"];
            const mockTags = [
                { text: "Eğlence", color_hex: "#FF4081" },
                { text: "Sohbet", color_hex: "#3F51B5" },
                { text: "Oyun", color_hex: "#4CAF50" },
                { text: "Müzik", color_hex: "#FFC107" },
                { text: "Yeni", color_hex: "#9C27B0" }
            ];

            finalRooms = Array.from({ length: 5 }).map((_, i) => ({
                id: `mock_${i + 1}`,
                name: mockNames[i],
                thumbnail_url: `https://picsum.photos/seed/room${i + 1}/400/200`,
                min_level: 1,
                type: "video",
                tags: [mockTags[i]]
            }));
        }

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
            rooms: finalRooms
        }, "Video odaları başarıyla getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
