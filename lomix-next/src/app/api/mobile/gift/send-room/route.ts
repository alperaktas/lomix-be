import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getSetting } from '@/lib/app-settings';

/**
 * @swagger
 * /api/mobile/gift/send-room:
 *   post:
 *     summary: Odaya hediye gönder
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
 *             properties:
 *               giftId:
 *                 type: integer
 *               roomId:
 *                 type: string
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

        const body = await request.json();
        const { giftId, roomId, amount = 1 } = body;

        if (!giftId || !roomId) {
            return NextResponse.json({ status: false, message: 'giftId ve roomId zorunludur' }, { status: 400 });
        }

        const qty = Math.max(1, parseInt(String(amount), 10));

        const [gift, room, sender, wallet] = await Promise.all([
            prisma.gift.findUnique({ where: { id: parseInt(String(giftId), 10) } }),
            prisma.room.findUnique({ where: { roomId: String(roomId) }, select: { id: true, roomId: true, ownerId: true, isLive: true } }),
            prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, fullName: true, avatar: true, level: true, isVip: true } }),
            prisma.wallet.findUnique({ where: { userId } }),
        ]);

        if (!gift || !gift.isVisible) {
            return NextResponse.json({ status: false, message: 'Hediye bulunamadı' }, { status: 404 });
        }
        if (!room || !room.isLive) {
            return NextResponse.json({ status: false, message: 'Oda bulunamadı veya aktif değil' }, { status: 404 });
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
                where: { userId: room.ownerId },
                update: { diamonds: { increment: diamondAmount } },
                create: { userId: room.ownerId, balance: 0, diamonds: diamondAmount },
            }),
            prisma.giftLog.create({
                data: {
                    giftId: gift.id,
                    senderId: userId,
                    roomId: room.id,
                    amount: qty,
                    totalPrice: totalCost,
                    commission,
                    diamondAmount,
                },
            }),
        ]);

        return NextResponse.json({
            status: true,
            message: 'Hediye gönderildi',
            data: {
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
