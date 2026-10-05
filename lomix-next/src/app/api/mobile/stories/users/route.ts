import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { storyThumbnail } from '@/lib/story-media';


/**
 * @swagger
 * /api/mobile/stories/users:
 *   get:
 *     summary: Aktif hikayesi olan kullanıcıları getirir (story bar)
 *     description: |
 *       Her girdi `user_id` ve o kullanıcının süresi dolmamış tüm hikayelerini
 *       (`stories[]`: story_id, media_url, thumbnail_url, duration_hours, created_at, expires_at) taşır.
 *       `image_url` story bar önizlemesidir: en yeni hikayenin görseli (video ise yüklenen thumbnail),
 *       yoksa profil avatarı. Profil avatarı her zaman `avatar_url` alanındadır.
 *       Bir hikayeyi açtıktan sonra görüntüleme kaydı için `/api/mobile/stories/view`'a
 *       ilgili `user_id` (ve istenirse `story_id`) gönderilmelidir.
 *     tags: [Mobile Stories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hikayesi olan kullanıcılar listelendi.
 */
export async function GET(request: Request) {
    try {
        // Süresi dolmamış hikayeleri olan kullanıcıları al
        const now = new Date();

        const activeStories = await prisma.story.findMany({
            where: {
                expiresAt: { gt: now }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        fullName: true,
                        username: true,
                        avatar: true
                    }
                }
            }
        });

        // Kullaniciya gore grupla: her kullanicinin tum aktif hikayelerini tek girdide topla.
        const byUser = new Map<number, typeof activeStories>();
        for (const story of activeStories) {
            const list = byUser.get(story.userId);
            if (list) list.push(story);
            else byUser.set(story.userId, [story]);
        }

        const usersData = Array.from(byUser.values()).map(stories => {
            const user = stories[0].user;
            const nameParts = (user?.fullName || user?.username || "").trim().split(" ");
            const first_name = nameParts[0] || "";
            const last_name = nameParts.slice(1).join(" ") || "";

            return {
                user_id: String(stories[0].userId),
                first_name,
                last_name,
                // Story bar önizlemesi: en yeni hikayenin görseli (video ise thumbnail),
                // yoksa profil avatarına düşer.
                image_url: storyThumbnail(stories[0]) || user?.avatar || null,
                avatar_url: user?.avatar || null,
                stories: stories.map(s => ({
                    story_id: String(s.id),
                    media_url: s.mediaUrl,
                    thumbnail_url: storyThumbnail(s),
                    duration_hours: s.durationHours,
                    created_at: s.createdAt.toISOString(),
                    expires_at: s.expiresAt.toISOString(),
                })),
            };
        });

        return ApiResponseHelper.success(usersData, "Hikayesi olan kullanıcılar listelendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
