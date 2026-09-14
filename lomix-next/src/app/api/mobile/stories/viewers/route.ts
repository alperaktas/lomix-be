import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/stories/viewers:
 *   get:
 *     summary: Hikayeyi görüntüleyenleri listele
 *     description: |
 *       Hikaye görüntüleyenlerini en yeniden eskiye doğru listeler.
 *       Gizlilik gereği bu listeyi **sadece hikaye sahibi** (ve platform admini) görebilir.
 *       `story_id` gönderilmezse kullanıcının tüm hikayelerinin görüntüleyenleri birleştirilir,
 *       aynı kişi birden fazla hikayeyi görmüşse listede bir kez yer alır.
 *     tags: [Mobile Stories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hikaye sahibinin kullanıcı ID'si
 *       - in: query
 *         name: story_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Hikaye ID (opsiyonel)
 *     responses:
 *       200:
 *         description: Hikaye görüntüleyenleri başarıyla getirildi
 *       400:
 *         description: Eksik veya geçersiz parametre
 *       401:
 *         description: Yetkisiz erişim
 *       403:
 *         description: Başkasının hikaye görüntüleyenleri listelenemez
 */
export async function GET(request: Request) {
    try {
        const currentUserId = await getCurrentUserId(request);
        if (!currentUserId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { searchParams } = new URL(request.url);
        const ownerIdRaw = searchParams.get('user_id');
        const storyIdRaw = searchParams.get('story_id');

        if (!ownerIdRaw) return ApiResponseHelper.error("user_id zorunludur.", 400);

        const ownerId = Number(ownerIdRaw);
        if (isNaN(ownerId)) return ApiResponseHelper.error("Geçersiz user_id.", 400);

        if (ownerId !== currentUserId) {
            const me = await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } });
            if (me?.role !== 'admin') {
                return ApiResponseHelper.error("Bu hikayenin görüntüleyenlerini listeleyemezsiniz.", 403);
            }
        }

        const where: { ownerId: number; storyId?: number } = { ownerId };
        if (storyIdRaw && storyIdRaw.trim() !== '') {
            const storyId = Number(storyIdRaw);
            if (isNaN(storyId)) return ApiResponseHelper.error("Geçersiz story_id.", 400);
            where.storyId = storyId;
        }

        const views = await prisma.storyView.findMany({
            where,
            orderBy: { viewedAt: 'desc' },
            include: {
                viewer: {
                    select: { id: true, username: true, fullName: true, avatar: true, level: true },
                },
            },
        });

        const seen = new Set<number>();
        const viewers = [];
        for (const view of views) {
            if (seen.has(view.viewerId)) continue;
            seen.add(view.viewerId);

            const user = view.viewer;
            const displayName = (user.fullName || user.username || "").trim();
            const nameParts = displayName.split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";

            viewers.push({
                id: String(user.id),
                user_id: String(user.id),
                first_name: firstName,
                last_name: lastName,
                name: displayName,
                level: user.level,
                image_url: user.avatar || null,
                display_id: String(user.id),
                viewed_at: view.viewedAt.toISOString(),
            });
        }

        return ApiResponseHelper.success(viewers, "Hikaye görüntüleyenleri başarıyla getirildi");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
