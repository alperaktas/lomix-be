import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/room/member-request:
 *   post:
 *     summary: Odaya üyelik isteği gönder
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *             properties:
 *               roomId:
 *                 type: string
 *                 description: Oda ID (roomId alanı)
 *     responses:
 *       200:
 *         description: İstek gönderildi
 *       409:
 *         description: Zaten istek gönderilmiş veya zaten üye
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return NextResponse.json({ status: false, message: 'Yetkisiz erişim.' }, { status: 401 });

        const { roomId } = await request.json();
        if (!roomId) return NextResponse.json({ status: false, message: 'roomId zorunludur.' }, { status: 400 });

        const room = await prisma.room.findUnique({
            where: { roomId: String(roomId) },
            select: { id: true, ownerId: true, isLive: true, isClosed: true },
        });
        if (!room) return NextResponse.json({ status: false, message: 'Oda bulunamadı.' }, { status: 404 });
        if (room.isClosed || !room.isLive) return NextResponse.json({ status: false, message: 'Bu oda aktif değil.' }, { status: 403 });
        if (room.ownerId === userId) return NextResponse.json({ status: false, message: 'Oda sahibisiniz.' }, { status: 400 });

        // Zaten üye mi?
        const alreadyMember = await prisma.roomMember.findUnique({
            where: { roomId_userId: { roomId: room.id, userId } },
        });
        if (alreadyMember) return NextResponse.json({ status: false, message: 'Zaten bu odanın üyesisiniz.' }, { status: 409 });

        // Zaten bekleyen istek var mı?
        const existing = await prisma.roomMemberRequest.findUnique({
            where: { roomId_userId: { roomId: room.id, userId } },
        });
        if (existing) {
            if (existing.status === 'pending') return NextResponse.json({ status: false, message: 'Zaten bekleyen bir isteğiniz var.' }, { status: 409 });
            // Reddedilmişse yeniden gönder
            await prisma.roomMemberRequest.update({
                where: { id: existing.id },
                data: { status: 'pending', createdAt: new Date() },
            });
            return NextResponse.json({ status: true, message: 'Üyelik isteği yeniden gönderildi.' });
        }

        await prisma.roomMemberRequest.create({
            data: { roomId: room.id, userId },
        });

        return NextResponse.json({ status: true, message: 'Üyelik isteği gönderildi.' });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/mobile/room/member-request:
 *   put:
 *     summary: Üyelik isteğini kabul et / reddet (oda sahibi/admin)
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *               - action
 *             properties:
 *               requestId:
 *                 type: integer
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *     responses:
 *       200:
 *         description: İşlem tamamlandı
 */
export async function PUT(request: Request) {
    try {
        const adminId = await getCurrentUserId(request);
        if (!adminId) return NextResponse.json({ status: false, message: 'Yetkisiz erişim.' }, { status: 401 });

        const { requestId, action } = await request.json();
        if (!requestId || !['accept', 'reject'].includes(action)) {
            return NextResponse.json({ status: false, message: 'requestId ve geçerli action (accept/reject) zorunludur.' }, { status: 400 });
        }

        const joinRequest = await prisma.roomMemberRequest.findUnique({
            where: { id: Number(requestId) },
            include: { room: { select: { id: true, ownerId: true } } },
        });
        if (!joinRequest) return NextResponse.json({ status: false, message: 'İstek bulunamadı.' }, { status: 404 });

        // Sadece oda sahibi veya admin kabul/red edebilir
        const isRoomAdmin = await prisma.roomMember.findFirst({
            where: { roomId: joinRequest.room.id, userId: adminId, role: 'admin' },
        });
        if (joinRequest.room.ownerId !== adminId && !isRoomAdmin) {
            return NextResponse.json({ status: false, message: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
        }

        await prisma.roomMemberRequest.update({
            where: { id: joinRequest.id },
            data: { status: action === 'accept' ? 'accepted' : 'rejected' },
        });

        if (action === 'accept') {
            await prisma.roomMember.upsert({
                where: { roomId_userId: { roomId: joinRequest.room.id, userId: joinRequest.userId } },
                create: { roomId: joinRequest.room.id, userId: joinRequest.userId, invitedBy: adminId },
                update: {},
            });
        }

        return NextResponse.json({ status: true, message: action === 'accept' ? 'İstek kabul edildi.' : 'İstek reddedildi.' });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
