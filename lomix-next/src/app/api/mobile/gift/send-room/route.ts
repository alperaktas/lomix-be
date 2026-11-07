import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getSetting } from '@/lib/app-settings';
import { isWalletBlocked, WALLET_BLOCK_MESSAGES } from '@/lib/wallet-guard';
import { spendOp, syncLevel, levelUpField } from '@/lib/level';
import { addRoomGift } from '@/lib/room-level';

/**
 * @swagger
 * /api/mobile/gift/send-room:
 *   post:
 *     summary: Odadaki bir kişiye hediye gönder
 *     description: |
 *       Odada hediye her zaman bir kişiye gönderilir (`toUserId` zorunlu); kişi kendine hediye gönderemez.
 *       Alıcı odanın sahibi, mikrofondaki biri ya da odadaki bir katılımcı olmalıdır. Elmas alıcıya yazılır.
 *       Hata kodları: 400 (toUserId yok / kendine gönderim), 404 (oda yok), 422 (alıcı odada değil).
 *     tags: [Mobile Gifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - giftId
 *               - roomId
 *               - toUserId
 *             properties:
 *               giftId:
 *                 type: integer
 *               roomId:
 *                 type: string
 *               toUserId:
 *                 type: integer
 *                 description: Hediyeyi alacak kişi (odada olmalı, kendisi olamaz)
 *               amount:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Hediye başarıyla gönderildi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
        }
        if (await isWalletBlocked(userId, 'spend')) {
            return NextResponse.json({ status: false, message: WALLET_BLOCK_MESSAGES.spend.message, error_code: WALLET_BLOCK_MESSAGES.spend.errorCode }, { status: 403 });
        }

        const body = await request.json();
        const { giftId, roomId, toUserId, amount = 1 } = body;

        if (!giftId || !roomId) {
            return NextResponse.json({ status: false, message: 'giftId ve roomId zorunludur' }, { status: 400 });
        }
        if (toUserId === undefined || toUserId === null || toUserId === '') {
            return NextResponse.json({ status: false, message: 'Hediye göndermek için bir kişi seçmelisiniz (toUserId zorunludur)' }, { status: 400 });
        }
        const toId = parseInt(String(toUserId), 10);
        if (!Number.isInteger(toId) || toId < 1) {
            return NextResponse.json({ status: false, message: 'toUserId geçersiz' }, { status: 400 });
        }
        if (toId === userId) {
            return NextResponse.json({ status: false, message: 'Kendinize hediye gönderemezsiniz' }, { status: 400 });
        }

        const qty = Math.max(1, parseInt(String(amount), 10));

        const [gift, room, sender, wallet, receiver] = await Promise.all([
            prisma.gift.findUnique({ where: { id: parseInt(String(giftId), 10) } }),
            prisma.room.findUnique({ where: { roomId: String(roomId) }, select: { id: true, roomId: true, ownerId: true, isLive: true } }),
            prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, fullName: true, avatar: true, level: true, isVip: true } }),
            prisma.wallet.findUnique({ where: { userId } }),
            prisma.user.findUnique({ where: { id: toId }, select: { id: true, username: true, fullName: true } }),
        ]);

        if (!gift || !gift.isVisible) {
            return NextResponse.json({ status: false, message: 'Hediye bulunamadı' }, { status: 404 });
        }
        if (!room || !room.isLive) {
            return NextResponse.json({ status: false, message: 'Oda bulunamadı veya aktif değil' }, { status: 404 });
        }

        if (!receiver) {
            return NextResponse.json({ status: false, message: 'Kullanıcı bulunamadı' }, { status: 404 });
        }
        // Alıcı odada olmalı: sahip, mikrofondaki ya da katılımcı.
        if (toId !== room.ownerId) {
            const [onMic, present] = await Promise.all([
                prisma.roomMicSlot.findFirst({ where: { roomId: room.id, userId: toId }, select: { id: true } }),
                prisma.roomParticipant.findFirst({ where: { roomId: room.id, userId: toId }, select: { id: true } }),
            ]);
            if (!onMic && !present) {
                return NextResponse.json({ status: false, message: 'Seçilen kişi bu odada değil' }, { status: 422 });
            }
        }

        const totalCost = gift.price * qty;
        const currentBalance = wallet?.balance ?? 0;
        if (currentBalance < totalCost) {
            return NextResponse.json({ status: false, message: 'Yetersiz coin bakiyesi' }, { status: 400 });
        }

        const commissionRate = await getSetting('gift_commission_rate');
        const diamondAmount = Math.floor(totalCost * (1 - commissionRate / 100));
        const commission = totalCost - diamondAmount;

        const origin = new URL(request.url).origin;
        const defaultAvatar = `${origin}/img/default-avatar.svg`;

        await prisma.$transaction([
            prisma.wallet.update({
                where: { userId },
                data: { balance: { decrement: totalCost } },
            }),
            prisma.wallet.upsert({
                where: { userId: toId },
                update: { diamonds: { increment: diamondAmount } },
                create: { userId: toId, balance: 0, diamonds: diamondAmount },
            }),
            prisma.giftLog.create({
                data: {
                    giftId: gift.id,
                    senderId: userId,
                    receiverId: toId,
                    roomId: room.id,
                    amount: qty,
                    totalPrice: totalCost,
                    commission,
                    diamondAmount,
                },
            }),
            spendOp(userId, totalCost),
        ]);

        const levelResult = await syncLevel(userId);
        const roomLevel = await addRoomGift(room.id, totalCost).catch(() => null);

        return NextResponse.json({
            status: true,
            message: 'Hediye gönderildi',
            data: {
                ...levelUpField(levelResult),
                remaining_balance: currentBalance - totalCost,
                rtm_event: {
                    type: 'GIFT_SENT',
                    gift_id: gift.id,
                    gift_name: gift.name,
                    gift_image_url: gift.imageUrl,
                    gift_svga_url: gift.svgaUrl || null,
                    amount: qty,
                    total_price: totalCost,
                    sender_id: String(userId),
                    sender_name: sender?.fullName || sender?.username || '',
                    sender_avatar_url: sender?.avatar?.trim() || defaultAvatar,
                    sender_level: sender?.level ?? 1,
                    sender_is_vip: sender?.isVip ?? false,
                    room_id: room.roomId,
                    room_level: roomLevel,
                    receiver_id: String(toId),
                    receiver_name: receiver.fullName || receiver.username || '',
                    diamond_amount: diamondAmount,
                    commission,
                },
            },
        });
    } catch (error: any) {
        console.error('Gift send-room error:', error);
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
