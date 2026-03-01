import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/stories:
 *   post:
 *     summary: Yeni hikaye oluşturur
 *     tags: [Mobile Stories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               media_file:
 *                 type: string
 *                 format: binary
 *               duration_hours:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Hikaye başarıyla eklendi.
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);

        if (!userId) {
            return NextResponse.json({ message: "Yetkisiz erişim" }, { status: 401 });
        }

        const formData = await request.formData();
        const durationHours = parseInt(formData.get('duration_hours') as string || "24", 10);
        // Varsayılan medya yolu (normalde S3/R2 gibi yükleme sonrası alınır)
        const mediaUrl = "https://picsum.photos/400/800";

        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

        const newStory = await prisma.story.create({
            data: {
                userId,
                mediaUrl,
                durationHours,
                expiresAt,
                isSeen: false
            }
        });

        return NextResponse.json({
            success: true,
            message: "Hikaye başarıyla eklendi.",
            data: {
                story_id: `st_${newStory.id}`,
                created_at: newStory.createdAt.toISOString()
            }
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Hikaye eklenemedi." }, { status: 400 });
    }
}
