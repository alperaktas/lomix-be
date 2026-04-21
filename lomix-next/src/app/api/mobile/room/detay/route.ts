import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

function formatGoldAmount(balance: number): string {
    if (balance >= 1000000) return (balance / 1000000).toFixed(1) + 'M';
    if (balance >= 1000) return (balance / 1000).toFixed(1) + 'k';
    return balance.toString();
}

/**
 * @swagger
 * /api/mobile/room/detay:
 *   post:
 *     summary: Oda Detayı Getir
 *     description: Belirli bir odanın detay bilgilerini getirir.
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
 *               - ownerId
 *             properties:
 *               roomId:
 *                 type: string
 *                 description: Oda ID
 *               ownerId:
 *                 type: integer
 *                 description: Oda sahibinin kullanıcı ID'si
 *     responses:
 *       200:
 *         description: Oda detayı başarıyla getirildi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { roomId, ownerId } = body;

        if (!roomId || !ownerId) {
            return NextResponse.json(
                { status: false, message: "roomId ve ownerId zorunludur" },
                { status: 400 }
            );
        }

        const room = await prisma.room.findFirst({
            where: {
                roomId: String(roomId),
                ownerId: Number(ownerId),
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        level: true,
                        isVip: true,
                        wallet: { select: { balance: true } },
                    },
                },
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                fullName: true,
                                avatar: true,
                                gender: true,
                                level: true,
                                isVip: true,
                            },
                        },
                    },
                    orderBy: { joinedAt: 'asc' },
                },
                micSlots: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatar: true,
                            },
                        },
                    },
                    orderBy: { slotIndex: 'asc' },
                },
                messages: {
                    include: {
                        user: {
                            select: {
                                username: true,
                                level: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
            },
        });

        if (!room) {
            return NextResponse.json(
                { status: false, message: "Oda bulunamadı" },
                { status: 404 }
            );
        }

        const hostName = room.owner.fullName || room.owner.username;
        const hostAvatar = room.owner.avatar || "";
        const goldAmount = formatGoldAmount(room.owner.wallet?.balance ?? 0);

        const participants = room.participants.map((p) => ({
            id: String(p.user.id),
            username: p.user.fullName || p.user.username,
            avatarUrl: p.user.avatar || "",
            gender: p.user.gender || "unknown",
            level: p.user.level,
            isVip: p.user.isVip,
            frameAsset: p.frameAsset || "",
        }));

        const micSlots = room.micSlots.map((slot) => ({
            index: slot.slotIndex,
            label: slot.label,
            icon: slot.icon,
            isLocked: slot.isLocked,
            isMuted: slot.isMuted,
            userId: slot.userId ? String(slot.userId) : null,
            username: slot.user?.username || null,
            avatarUrl: slot.user?.avatar || null,
        }));

        const messages = room.messages.reverse().map((msg) => ({
            level: `Lvl ${msg.user.level}`,
            levelColor: msg.levelColor || "#98E306",
            userName: (msg.user.username) + ": ",
            message: msg.message,
            emoji: msg.emoji || "",
        }));

        return NextResponse.json({
            status: true,
            message: "Oda detayı getirildi",
            data: {
                roomId: room.roomId,
                roomName: room.name,
                hostName,
                hostAvatar,
                goldAmount,
                onlineCount: participants.length,
                participants,
                micSlots,
                messages,
            },
        });
    } catch (error: any) {
        console.error("Room detay error:", error);
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
