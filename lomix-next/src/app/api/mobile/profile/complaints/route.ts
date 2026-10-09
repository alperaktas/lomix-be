import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { readComplaintRequest, serializeComplaint } from '@/lib/complaints';

/**
 * @swagger
 * /api/mobile/profile/complaints:
 *   get:
 *     summary: Şikayet ve önerilerim
 *     description: Yalnızca token'daki kullanıcının kendi talepleri, en yeniden eskiye.
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Talepler listelendi (data kayıt dizisi)
 *   post:
 *     summary: Şikayet / öneri oluştur
 *     description: Yeni talep `pending` durumuyla açılır.
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, description]
 *             properties:
 *               category:
 *                 type: string
 *                 description: En fazla 50 karakter
 *               description:
 *                 type: string
 *                 description: En fazla 1000 karakter
 *               image_url:
 *                 type: string
 *                 description: Önceden /api/mobile/upload ile yüklenmiş tek resim adresi
 *               image_urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Önceden yüklenmiş resim adresleri (en fazla 5)
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [category, description]
 *             properties:
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Resim dosyası (jpeg/png/webp/gif, 5MB, en fazla 5 adet); alan adı önemli değil
 *     responses:
 *       201:
 *         description: Talep oluşturuldu (id, category, description, status)
 *       400:
 *         description: Doğrulama hatası
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const items = await prisma.complaint.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        return ApiResponseHelper.success(items.map(serializeComplaint), "Talepler listelendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const parsed = await readComplaintRequest(request);
        if ('error' in parsed) return ApiResponseHelper.error(parsed.error, 400);

        const created = await prisma.complaint.create({
            data: {
                userId,
                category: parsed.category,
                description: parsed.description,
                imageUrls: parsed.images ?? [],
                status: 'pending',
            },
        });

        return ApiResponseHelper.success(serializeComplaint(created), "Talebiniz alındı.", 201);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
