import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/stories/add:
 *   post:
 *     summary: Yeni hikaye ekle
 *     tags: [Mobile Stories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mediaUrl: { type: string, example: "https://example.com/video.mp4" }
 *               durationHours: { type: integer, example: 24 }
 *     responses:
 *       200:
 *         description: Başarılı
 *       401:
 *         description: Yetkisiz
 *       400:
 *         description: Hatalı istek
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return ApiResponseHelper.error("Unauthorized", 401);
        }

        // FormData veya JSON desteği
        let mediaUrl = "";
        let durationHours = 24;

        try {
            const formData = await request.formData();
            mediaUrl = formData.get('mediaUrl') as string || "";
            durationHours = parseInt(formData.get('durationHours') as string || "24", 10);
        } catch {
            const body = await request.json();
            mediaUrl = body.mediaUrl || "";
            durationHours = body.durationHours || 24;
        }

        if (!mediaUrl) {
            return ApiResponseHelper.error("mediaUrl is required", 400);
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + durationHours);

        const story = await prisma.story.create({
            data: {
                userId,
                mediaUrl,
                durationHours,
                expiresAt
            }
        });

        return ApiResponseHelper.success(story, "Hikaye başarıyla eklendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
