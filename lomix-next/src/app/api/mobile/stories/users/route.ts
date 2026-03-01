import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

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

        return NextResponse.json(usersData);
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
