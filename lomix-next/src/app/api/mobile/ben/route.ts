import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getZodiac } from '@/lib/dm-time';

/**
 * @swagger
 * /api/mobile/ben:
 *   get:
 *     summary: Kendi Profil Bilgilerim
 *     tags: [Mobile Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bilgiler başarıyla getirildi
 */
async function getUserProfile(targetUserId: number, request: Request) {
    const [user, photos] = await Promise.all([
        prisma.user.findUnique({
            where: { id: targetUserId },
            include: {
                wallet: { select: { balance: true } },
                avatarHistory: { orderBy: { createdAt: 'desc' } },
                rooms: {
                    where: { isLive: true },
                    take: 1,
                    include: { _count: { select: { members: true } } },
                },
                anlar: {
                    orderBy: { createdAt: 'desc' },
                    take: 6,
                    select: { id: true, description: true, imageUrl: true },
                },
                ownedAgency: {
                    select: { name: true },
                },
                agencyMembership: {
                    include: {
                        agency: { select: { name: true } },
                    },
                },
            },
        }),
        prisma.userPhoto.findMany({
            where: { userId: targetUserId },
            orderBy: { order: 'asc' },
            select: { id: true, url: true, order: true },
        }),
    ]);

    if (!user) return ApiResponseHelper.error("Kullanıcı bulunamadı.", 404);

    const room = user.rooms[0] ?? null;

    return ApiResponseHelper.success({
        user_info: {
            id: String(user.id),
            username: user.username,
            full_name: user.fullName || '',
            avatar_url: user.avatar?.trim() || `${new URL(request.url).origin}/img/default-avatar.svg`,
            description: user.description || '',
            country: user.country || '',
            birth_date: user.birthDate ? user.birthDate.toISOString().split('T')[0] : null,
            zodiac: user.birthDate ? getZodiac(user.birthDate) : null,
            join_date: user.createdAt.toISOString().split('T')[0],
            level: user.level,
            is_vip: user.isVip,
            avatar_history: user.avatarHistory.map(h => ({
                id: h.id,
                image_url: h.imageUrl,
                is_active: h.isActive,
            })),
        },
        wallet: {
            balance: user.wallet?.balance ?? 0,
            is_vip: user.isVip,
        },
        oda: room ? {
            id: room.roomId,
            name: room.name,
            cover_url: room.thumbnailUrl || '',
            member_count: room._count.members,
        } : null,
        anlar: user.anlar.map(a => ({
            id: String(a.id),
            content: a.description || '',
            image_url: a.imageUrl || '',
        })),
        photos: photos.map(p => ({
            id: p.id,
            url: p.url,
            order: p.order,
        })),
        family: (user.ownedAgency ?? user.agencyMembership?.agency) ? {
            name: (user.ownedAgency ?? user.agencyMembership?.agency)!.name,
            earning_text: "Kazan",
        } : null,
    }, "Bilgiler başarıyla getirildi");
}

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);
        return await getUserProfile(userId, request);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function POST(request: Request) {
    try {
        const authUserId = await getCurrentUserId(request);
        if (!authUserId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const body = await request.json().catch(() => ({}));
        const targetUserId = body.user_id ? Number(body.user_id) : authUserId;

        return await getUserProfile(targetUserId, request);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
