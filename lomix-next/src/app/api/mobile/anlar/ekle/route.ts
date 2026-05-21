import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { put } from '@vercel/blob';

/**
 * @swagger
 * /api/mobile/anlar/ekle:
 *   post:
 *     summary: Yeni An Ekle
 *     tags: [Mobile Anlar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [description]
 *             properties:
 *               description:
 *                 type: string
 *               tags:
 *                 type: string
 *                 description: 'JSON array string. Örn: ["Spor","Yemek"]'
 *               action_type:
 *                 type: string
 *                 enum: [hi, sohbet]
 *                 default: hi
 *               image_path:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: An eklendi
 *       403:
 *         description: An paylaşma yasağı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { anBanned: true } });
        if (user?.anBanned) return ApiResponseHelper.error("An paylaşma yasağınız bulunmaktadır.", 403);

        const formData = await request.formData();
        const description = (formData.get('description') as string)?.trim();
        if (!description) return ApiResponseHelper.error("description zorunludur.", 400);

        const actionType = (formData.get('action_type') as string) || 'hi';
        const tagsRaw = formData.get('tags') as string | null;
        const tagList: string[] = tagsRaw ? JSON.parse(tagsRaw) : [];

        const imageFile = formData.get('image_path') as File | null;
        let imageUrl: string | null = null;
        if (imageFile && typeof imageFile !== 'string') {
            const blob = await put(imageFile.name, imageFile, { access: 'public', addRandomSuffix: true });
            imageUrl = blob.url;
        }

        const an = await prisma.an.create({
            data: {
                userId,
                description,
                actionType,
                imageUrl,
                tags: { create: tagList.map(tag => ({ tag })) },
            },
        });

        return ApiResponseHelper.success({ id: String(an.id) }, "An eklendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
