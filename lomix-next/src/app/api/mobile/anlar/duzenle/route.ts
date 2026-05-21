import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { put } from '@vercel/blob';

/**
 * @swagger
 * /api/mobile/anlar/duzenle:
 *   post:
 *     summary: Anı Düzenle
 *     tags: [Mobile Anlar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: string
 *                 description: 'JSON array string. Örn: ["Spor","Yemek"]'
 *               image_path:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: An güncellendi
 *       403:
 *         description: Yetkisiz
 *       404:
 *         description: An bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const formData = await request.formData();
        const id = formData.get('id') as string;
        if (!id) return ApiResponseHelper.error("id zorunludur.", 400);

        const an = await prisma.an.findUnique({ where: { id: Number(id) } });
        if (!an) return ApiResponseHelper.error("An bulunamadı.", 404);
        if (an.userId !== userId) return ApiResponseHelper.error("Bu anı düzenleme yetkiniz yok.", 403);

        const updateData: any = {};
        const description = formData.get('description') as string | null;
        if (description !== null) updateData.description = description.trim();

        const imageFile = formData.get('image_path') as File | null;
        if (imageFile && typeof imageFile !== 'string') {
            const blob = await put(imageFile.name, imageFile, { access: 'public', addRandomSuffix: true });
            updateData.imageUrl = blob.url;
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.an.update({ where: { id: an.id }, data: updateData });
        }

        const tagsRaw = formData.get('tags') as string | null;
        if (tagsRaw) {
            const tags: string[] = JSON.parse(tagsRaw);
            await prisma.anTag.deleteMany({ where: { anId: an.id } });
            await prisma.anTag.createMany({ data: tags.map(tag => ({ anId: an.id, tag })) });
        }

        return ApiResponseHelper.success({ id: String(an.id) }, "An güncellendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
