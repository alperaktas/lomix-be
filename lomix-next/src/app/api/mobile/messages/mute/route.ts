import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/messages/mute:
 *   post:
 *     summary: Sohbet Bildirimlerini Sessize Al / Sesi Aç
 *     description: |
 *       `muted` gönderilirse o değer yazılır (idempotent). Gönderilmezse mevcut durumun tersine
 *       çevrilir (pin ile aynı toggle davranışı). Durum sohbet listesinde `is_muted` olarak döner.
 *     tags: [Mobile Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: Sohbetin karşı tarafındaki kullanıcı
 *               muted:
 *                 type: boolean
 *                 description: Opsiyonel. Verilmezse toggle.
 *     responses:
 *       200:
 *         description: Sessize alma durumu güncellendi
 *       404:
 *         description: Kullanıcı bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { user_id, muted } = await request.json().catch(() => ({}));
        if (!user_id) return ApiResponseHelper.error("user_id zorunludur.", 400);

        const otherUserId = Number(user_id);
        if (isNaN(otherUserId)) return ApiResponseHelper.error("Geçersiz user_id.", 400);
        if (otherUserId === userId) return ApiResponseHelper.error("Kendi sohbetinizi sessize alamazsınız.", 400);

        const other = await prisma.user.findUnique({ where: { id: otherUserId }, select: { id: true } });
        if (!other) return ApiResponseHelper.error("Kullanıcı bulunamadı.", 404);

        const existing = await prisma.conversation.findUnique({
            where: { userId_otherUserId: { userId, otherUserId } },
        });

        const isMuted = typeof muted === 'boolean' ? muted : !(existing?.isMuted ?? false);

        await prisma.conversation.upsert({
            where: { userId_otherUserId: { userId, otherUserId } },
            create: { userId, otherUserId, isMuted },
            update: { isMuted },
        });

        return ApiResponseHelper.success(
            { user_id: String(otherUserId), is_muted: isMuted },
            isMuted ? "Bildirimler sessize alındı." : "Bildirimlerin sesi açıldı."
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
