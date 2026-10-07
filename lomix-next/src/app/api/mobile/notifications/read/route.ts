import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { visibleNotificationsWhere } from '@/lib/notifications';

/**
 * @swagger
 * /api/mobile/notifications/read:
 *   post:
 *     summary: Bildirimi okundu işaretle
 *     description: '`id` verilirse o bildirim, `all: true` verilirse görünen tüm bildirimler okundu olur (idempotent).'
 *     tags: [Mobile Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               all:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Okundu olarak işaretlendi
 *       404:
 *         description: Bildirim bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { id, all } = await request.json().catch(() => ({}));
        if (!all && !id) return ApiResponseHelper.error("id veya all zorunludur.", 400);

        const where = await visibleNotificationsWhere(userId);
        if (!where) return ApiResponseHelper.error("Kullanıcı bulunamadı.", 404);

        if (all) {
            const unread = await prisma.notification.findMany({
                where: { AND: [where, { reads: { none: { userId } } }] },
                select: { id: true },
                take: 1000,
            });
            await prisma.notificationRead.createMany({
                data: unread.map(n => ({ notificationId: n.id, userId })),
                skipDuplicates: true,
            });
            return ApiResponseHelper.success({ marked: unread.length }, "Tüm bildirimler okundu işaretlendi.");
        }

        const notificationId = Number(id);
        if (isNaN(notificationId)) return ApiResponseHelper.error("Geçersiz id.", 400);

        const visible = await prisma.notification.findFirst({
            where: { AND: [where, { id: notificationId }] },
            select: { id: true },
        });
        if (!visible) return ApiResponseHelper.error("Bildirim bulunamadı.", 404);

        await prisma.notificationRead.upsert({
            where: { notificationId_userId: { notificationId, userId } },
            create: { notificationId, userId },
            update: {},
        });
        return ApiResponseHelper.success({ marked: 1 }, "Bildirim okundu işaretlendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
