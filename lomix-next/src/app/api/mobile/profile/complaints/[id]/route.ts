import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { parseComplaintBody, serializeComplaint } from '@/lib/complaints';

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * @swagger
 * /api/mobile/profile/complaints/{id}:
 *   get:
 *     summary: Talep detayı
 *     description: Başka kullanıcıya ait ya da olmayan talep için 404 döner.
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Talep detayı
 *       404:
 *         description: Talep bulunamadı
 *   post:
 *     summary: Talebi güncelle
 *     description: |
 *       category ve description güncellenir. Yalnızca kendi talebiniz ve durumu `completed`
 *       olmayan talepler değiştirilebilir. Tamamlanmış talep için 409 döner. Durum kontrolü
 *       güncellemeyle aynı sorguda yapıldığından tamamlanma ile güncelleme yarışında da
 *       tamamlanmış talep değişmez.
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Talep güncellendi
 *       400:
 *         description: Doğrulama hatası
 *       404:
 *         description: Talep bulunamadı
 *       409:
 *         description: Tamamlanmış talep değiştirilemez
 */
export async function GET(request: Request, { params }: Ctx) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const id = parseId((await params).id);
        if (!id) return ApiResponseHelper.error("Talep bulunamadı.", 404);

        const item = await prisma.complaint.findFirst({ where: { id, userId } });
        if (!item) return ApiResponseHelper.error("Talep bulunamadı.", 404);

        return ApiResponseHelper.success(serializeComplaint(item), "Talep getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function POST(request: Request, { params }: Ctx) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const id = parseId((await params).id);
        if (!id) return ApiResponseHelper.error("Talep bulunamadı.", 404);

        const parsed = parseComplaintBody(await request.json().catch(() => null));
        if ('error' in parsed) return ApiResponseHelper.error(parsed.error, 400);

        // Sahiplik ve "tamamlanmamış" koşulu güncellemenin kendi WHERE'inde: kontrol ile yazma arasında
        // talep tamamlansa bile bu sorgu 0 satır günceller.
        const result = await prisma.complaint.updateMany({
            where: { id, userId, status: { not: 'completed' } },
            data: { category: parsed.category, description: parsed.description },
        });

        if (result.count === 0) {
            const current = await prisma.complaint.findFirst({ where: { id, userId }, select: { status: true } });
            if (!current) return ApiResponseHelper.error("Talep bulunamadı.", 404);
            return ApiResponseHelper.error("Tamamlanmış talep güncellenemez.", 409);
        }

        const updated = await prisma.complaint.findFirst({ where: { id, userId } });
        return ApiResponseHelper.success(serializeComplaint(updated!), "Talep güncellendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
