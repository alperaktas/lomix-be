import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';


/**
 * @swagger
 * /api/mobile/stories/users:
 *   get:
 *     summary: Aktif hikayesi olan kullanıcıları getirir (story bar)
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

        // Distinct userId ile hikayeleri al
        const activeStories = await prisma.story.findMany({
            where: {
                expiresAt: { gt: now }
            },
            distinct: ['userId'],
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

        const usersData = activeStories.map(story => {
            const user = story.user;
            const nameParts = (user?.fullName || user?.username || "").trim().split(" ");
            const first_name = nameParts[0] || "";
            const last_name = nameParts.slice(1).join(" ") || "";

            return {
                first_name,
                last_name,
                image_url: user?.avatar || null
            };
        });

        return ApiResponseHelper.success(usersData, "Hikayesi olan kullanıcılar listelendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
