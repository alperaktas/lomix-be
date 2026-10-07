import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { visibleNotificationsWhere } from '@/lib/notifications';

/**
 * @swagger
 * /api/mobile/notifications/unread-count:
 *   get:
 *     summary: Okunmamış bildirim sayısı (rozet için)
 *     tags: [Mobile Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sayı getirildi
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const where = await visibleNotificationsWhere(userId);
        if (!where) return ApiResponseHelper.error("Kullanıcı bulunamadı.", 404);

        const count = await prisma.notification.count({
            where: { AND: [where, { reads: { none: { userId } } }] },
        });
        return ApiResponseHelper.success({ unread_count: count }, "Okunmamış bildirim sayısı getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
