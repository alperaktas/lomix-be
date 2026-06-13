import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/room/member-requests:
 *   get:
 *     summary: Odaya gelen üyelik isteklerini listele (oda sahibi/admin)
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Oda ID (roomId alanı)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *         description: Filtre (varsayılan pending)
 *     responses:
 *       200:
 *         description: İstekler listelendi
 */
export async function GET(request: Request) {
    try {
        const adminId = await getCurrentUserId(request);
        if (!adminId) return NextResponse.json({ status: false, message: 'Yetkisiz erişim.' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');
        const status = searchParams.get('status') || 'pending';

        if (!roomId) return NextResponse.json({ status: false, message: 'roomId zorunludur.' }, { status: 400 });

        const room = await prisma.room.findUnique({
            where: { roomId: String(roomId) },
            select: { id: true, ownerId: true },
        });
        if (!room) return NextResponse.json({ status: false, message: 'Oda bulunamadı.' }, { status: 404 });

        // Sadece oda sahibi veya admin görebilir
        const isRoomAdmin = await prisma.roomMember.findFirst({
            where: { roomId: room.id, userId: adminId, role: 'admin' },
        });
        if (room.ownerId !== adminId && !isRoomAdmin) {
            return NextResponse.json({ status: false, message: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
        }

        const requests = await prisma.roomMemberRequest.findMany({
            where: { roomId: room.id, status },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { id: true, username: true, fullName: true, avatar: true, level: true, isVip: true },
                },
            },
        });

        const origin = new URL(request.url).origin;

        return NextResponse.json({
            status: true,
            data: requests.map(r => ({
                request_id: r.id,
                status: r.status,
                created_at: r.createdAt,
                user: {
                    id: r.user.id,
                    username: r.user.fullName || r.user.username,
                    avatar_url: r.user.avatar?.trim() || `${origin}/img/default-avatar.svg`,
                    level: r.user.level,
                    is_vip: r.user.isVip,
                },
            })),
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
