import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

const POPULAR_VIEWER_THRESHOLD = 20;

function mapRoom(room: any, origin: string) {
    const badges: string[] = [];
    if (room.isVip) badges.push('vip');
    if (room.viewerCount >= POPULAR_VIEWER_THRESHOLD) badges.push('popular');

    return {
        room_id: room.roomId,
        room_name: room.name,
        thumbnail_url: room.thumbnailUrl || null,
        owner_id: String(room.ownerId),
        owner_name: room.owner?.fullName || room.owner?.username,
        avatar_url: room.owner?.avatar?.trim() || `${origin}/img/default-avatar.svg`,
        viewer_count: room.viewerCount,
        is_pk: room.mode === 'pk',
        badges,
    };
}

/**
 * @swagger
 * /api/mobile/rooms/mine:
 *   get:
 *     summary: Kendi odam ve takip ettiklerimin canlı odaları
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Odalar getirildi
 *       401:
 *         description: Yetkisiz erişim
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const origin = new URL(request.url).origin;

        const [myRoom, follows] = await Promise.all([
            prisma.room.findFirst({
                where: { ownerId: userId, isLive: true },
                include: { owner: true },
            }),
            prisma.userFollow.findMany({
                where: { followerId: userId },
                select: { followingId: true },
            }),
        ]);

        const followingIds = follows.map(f => f.followingId);

        const followedRooms = followingIds.length > 0
            ? await prisma.room.findMany({
                where: { ownerId: { in: followingIds }, isLive: true },
                include: { owner: true },
                orderBy: { viewerCount: 'desc' },
            })
            : [];

        return ApiResponseHelper.success({
            my_room: myRoom ? mapRoom(myRoom, origin) : null,
            followed_rooms: followedRooms.map(r => mapRoom(r, origin)),
        }, "Odalar getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
