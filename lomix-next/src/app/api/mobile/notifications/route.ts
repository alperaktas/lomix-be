import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { visibleNotificationsWhere } from '@/lib/notifications';

/**
 * @swagger
 * /api/mobile/notifications:
 *   get:
 *     summary: Bildirimlerim (gelen kutusu)
 *     description: |
 *       Kullanıcıya gönderilen genel, yayıncı, ajans ve kişiye özel bildirimleri en yeniden
 *       eskiye listeler. Üyelikten önce gönderilmiş toplu bildirimler gösterilmez.
 *       `meta.unread_count` toplam okunmamış sayısını verir.
 *     tags: [Mobile Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           description: 'Varsayılan 20, en fazla 50'
 *     responses:
 *       200:
 *         description: Bildirimler getirildi
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const where = await visibleNotificationsWhere(userId);
        if (!where) return ApiResponseHelper.error("Kullanıcı bulunamadı.", 404);

        const { searchParams } = new URL(request.url);
        const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);

        const [items, total, unread] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: { reads: { where: { userId }, select: { id: true } } },
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { AND: [where, { reads: { none: { userId } } }] } }),
        ]);

        return ApiResponseHelper.success(
            items.map(n => ({
                id: String(n.id),
                title: n.title,
                body: n.body,
                type: n.type,
                data: n.data ?? null,
                is_read: n.reads.length > 0,
                created_at: n.createdAt.toISOString(),
            })),
            "Bildirimler getirildi.",
            200,
            { current_page: page, total_pages: Math.ceil(total / limit) || 1, unread_count: unread }
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
