import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/stories/view:
 *   post:
 *     summary: Hikaye görüntüleme kaydı oluştur
 *     description: |
 *       Token'daki kullanıcıyı ilgili hikayenin görüntüleyeni olarak kaydeder.
 *       `story_id` gönderilmezse hikaye sahibinin süresi dolmamış **en yeni** hikayesi kullanılır;
 *       aktif hikayesi yoksa en son hikayesine düşülür.
 *       Aynı kullanıcının aynı hikayeyi tekrar görüntülemesi yeni kayıt oluşturmaz,
 *       ilk görüntüleme zamanı korunur. Kullanıcı kendi hikayesine bakarsa kayıt tutulmaz.
 *     tags: [Mobile Stories]
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
 *                 type: string
 *                 description: Hikaye sahibinin kullanıcı ID'si
 *               story_id:
 *                 type: string
 *                 description: Hikaye ID (opsiyonel)
 *     responses:
 *       200:
 *         description: Hikaye görüntüleme kaydı başarıyla alındı
 *       400:
 *         description: Eksik veya geçersiz parametre
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Hikaye bulunamadı
 */
export async function POST(request: Request) {
    try {
        const viewerId = await getCurrentUserId(request);
        if (!viewerId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const body = await request.json().catch(() => ({}));
        const ownerIdRaw = body.user_id ?? body.userId;
        const storyIdRaw = body.story_id ?? body.storyId;

        if (ownerIdRaw === undefined || ownerIdRaw === null || String(ownerIdRaw).trim() === '') {
            return ApiResponseHelper.error("user_id zorunludur.", 400);
        }

        const ownerId = Number(ownerIdRaw);
        if (isNaN(ownerId)) return ApiResponseHelper.error("Geçersiz user_id.", 400);

        let story;
        if (storyIdRaw !== undefined && storyIdRaw !== null && String(storyIdRaw).trim() !== '') {
            const storyId = Number(storyIdRaw);
            if (isNaN(storyId)) return ApiResponseHelper.error("Geçersiz story_id.", 400);
            story = await prisma.story.findFirst({ where: { id: storyId, userId: ownerId } });
        } else {
            // Once suresi dolmamis en yeni hikaye; yoksa kullanicinin en son hikayesine dusuyoruz.
            story = await prisma.story.findFirst({
                where: { userId: ownerId, expiresAt: { gt: new Date() } },
                orderBy: { createdAt: 'desc' },
            });
            if (!story) {
                story = await prisma.story.findFirst({
                    where: { userId: ownerId },
                    orderBy: { createdAt: 'desc' },
                });
            }
        }

        if (!story) return ApiResponseHelper.error("Hikaye bulunamadı.", 404);

        // Kendi hikayesine bakan kullanıcı görüntüleyen listesine girmez.
        if (viewerId === ownerId) {
            return ApiResponseHelper.success(
                {
                    viewed: true,
                    user_id: String(ownerId),
                    story_id: String(story.id),
                    viewer_id: String(viewerId),
                    viewed_at: new Date().toISOString(),
                },
                "Hikaye görüntüleme kaydı başarıyla alındı"
            );
        }

        const view = await prisma.storyView.upsert({
            where: { storyId_viewerId: { storyId: story.id, viewerId } },
            update: {},
            create: { storyId: story.id, ownerId, viewerId },
        });

        return ApiResponseHelper.success(
            {
                viewed: true,
                user_id: String(ownerId),
                story_id: String(story.id),
                viewer_id: String(viewerId),
                viewed_at: view.viewedAt.toISOString(),
            },
            "Hikaye görüntüleme kaydı başarıyla alındı"
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
