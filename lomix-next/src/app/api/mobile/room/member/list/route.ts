import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/room/member/list:
 *   post:
 *     summary: Oda üyelerini ve adminlerini listele
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId]
 *             properties:
 *               roomId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Üye listesi
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId } = await request.json();
        if (!roomId) return ApiResponseHelper.error("roomId zorunludur.", 400);

        const where = isNaN(Number(roomId)) ? { roomId: String(roomId) } : { id: Number(roomId) };
        const room = await prisma.room.findFirst({
            where,
            select: { id: true, ownerId: true, owner: { select: { id: true, username: true, fullName: true, avatar: true, level: true } } },
        });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        const members = await prisma.roomMember.findMany({
            where: { roomId: room.id },
            include: {
                user: { select: { id: true, username: true, fullName: true, avatar: true, level: true, isVip: true } },
            },
            orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        });

        const admins = members
            .filter(m => m.role === 'admin')
            .map(m => ({
                id: String(m.user.id),
                username: m.user.username,
                fullName: m.user.fullName || m.user.username,
                avatarUrl: m.user.avatar || '',
                level: m.user.level,
                isVip: m.user.isVip,
                role: 'admin',
                since: m.createdAt,
            }));

        const regularMembers = members
            .filter(m => m.role === 'member')
            .map(m => ({
                id: String(m.user.id),
                username: m.user.username,
                fullName: m.user.fullName || m.user.username,
                avatarUrl: m.user.avatar || '',
                level: m.user.level,
                isVip: m.user.isVip,
                role: 'member',
                since: m.createdAt,
            }));

        return ApiResponseHelper.success({
            owner: {
                id: String(room.owner.id),
                username: room.owner.username,
                fullName: room.owner.fullName || room.owner.username,
                avatarUrl: room.owner.avatar || '',
                level: room.owner.level,
                role: 'owner',
            },
            admins,
            members: regularMembers,
            totalCount: 1 + admins.length + regularMembers.length,
        }, "Üye listesi getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
