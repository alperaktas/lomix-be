import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { generateAgoraToken, registerAgoraChatUser, createAgoraChatRoom } from '@/lib/agora';
import { getRoomRole } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/join:
 *   post:
 *     summary: Odaya Katıl
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
 *     responses:
 *       200:
 *         description: Odaya başarıyla katıldınız
 *       403:
 *         description: Seviye yetersiz veya oda aktif değil
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const { roomId } = await request.json();
        if (!roomId) {
            return NextResponse.json({ status: false, message: "roomId zorunludur" }, { status: 400 });
        }

        const room = await prisma.room.findUnique({
            where: { roomId: String(roomId) },
            select: { id: true, roomId: true, name: true, isLive: true, isClosed: true, minLevel: true, ownerId: true, memberOnlyMic: true, agoraChatRoomId: true },
        });

        if (!room) {
            return NextResponse.json({ status: false, message: "Oda bulunamadı" }, { status: 404 });
        }

        if (room.isClosed || !room.isLive) {
            return NextResponse.json({ status: false, message: "Bu oda aktif değil" }, { status: 403 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { level: true, username: true, fullName: true, avatar: true },
        });

        if (user && user.level < room.minLevel) {
            return NextResponse.json({ status: false, message: `Bu odaya katılmak için minimum seviye ${room.minLevel} gerekiyor` }, { status: 403 });
        }

        // Katılımcıyı kaydet (zaten varsa güncelleme yapma)
        await prisma.roomParticipant.upsert({
            where: { roomId_userId: { roomId: room.id, userId } },
            create: { roomId: room.id, userId },
            update: {},
        });

        // Görüntüleyici sayısını güncelle
        await prisma.room.update({
            where: { id: room.id },
            data: { viewerCount: { increment: 1 } },
        });

        // Kullanıcıyı Agora Chat'e kaydet
        await registerAgoraChatUser(String(userId));

        // Eski odaların chatroom'u yoksa lazy yarat
        let agoraChatRoomId: string | null = room.agoraChatRoomId;
        if (!agoraChatRoomId) {
            agoraChatRoomId = await createAgoraChatRoom(room.name, String(room.ownerId));
            await prisma.room.update({ where: { id: room.id }, data: { agoraChatRoomId } });
        }

        const agoraToken = generateAgoraToken(room.roomId, userId);
        const myRole = await getRoomRole(room.id, userId, room.ownerId);

        logRoomEvent(room.id, userId, 'ROOM_JOINED');

        return NextResponse.json({
            status: true,
            message: "Odaya katıldınız",
            data: {
                room_id: room.roomId,
                channel_name: room.roomId,
                agora_token: agoraToken,
                uid: userId,
                my_role: myRole,
                member_only_mic: room.memberOnlyMic,
                can_use_mic: myRole !== 'visitor' || !room.memberOnlyMic,
                agora_chat_room_id: room.agoraChatRoomId,
                rtm_event: {
                    type: 'USER_JOINED',
                    userId: String(userId),
                    username: user?.fullName || user?.username || '',
                    avatarUrl: user?.avatar?.trim() || `${new URL(request.url).origin}/img/default-avatar.svg`,
                },
            },
        });
    } catch (error: any) {
        console.error("Room join error:", error);
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
