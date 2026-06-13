import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/gift/send-user:
 *   post:
 *     summary: Kullanıcıya hediye gönder (özel mesaj geçmişine kaydeder)
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
 *               - toUserId
 *             properties:
 *               giftId:
 *                 type: integer
 *               toUserId:
 *                 type: integer
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
        const { giftId, toUserId, amount = 1 } = body;

        if (!giftId || !toUserId) {
            return NextResponse.json({ status: false, message: 'giftId ve toUserId zorunludur' }, { status: 400 });
        }

        const toId = parseInt(String(toUserId), 10);
        if (toId === userId) {
            return NextResponse.json({ status: false, message: 'Kendinize hediye gönderemezsiniz' }, { status: 400 });
        }

        const qty = Math.max(1, parseInt(String(amount), 10));

        const [gift, receiver, sender, wallet] = await Promise.all([
            prisma.gift.findUnique({ where: { id: parseInt(String(giftId), 10) } }),
            prisma.user.findUnique({ where: { id: toId }, select: { id: true, username: true, fullName: true, avatar: true } }),
            prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, fullName: true, avatar: true, level: true, isVip: true } }),
            prisma.wallet.findUnique({ where: { userId } }),
        ]);

        if (!gift || !gift.isVisible) {
            return NextResponse.json({ status: false, message: 'Hediye bulunamadı' }, { status: 404 });
        }
        if (!receiver) {
            return NextResponse.json({ status: false, message: 'Kullanıcı bulunamadı' }, { status: 404 });
        }

        const totalCost = gift.price * qty;
        const currentBalance = wallet?.balance ?? 0;
        if (currentBalance < totalCost) {
            return NextResponse.json({ status: false, message: 'Yetersiz coin bakiyesi' }, { status: 400 });
        }

        const origin = new URL(request.url).origin;
        const defaultAvatar = `${origin}/img/default-avatar.svg`;

        // Deduct coins, create gift log, and save to DM history in one transaction
        const [, , directMessage] = await prisma.$transaction([
            prisma.wallet.update({
                where: { userId },
                data: { balance: { decrement: totalCost } },
            }),
            prisma.giftLog.create({
                data: {
                    giftId: gift.id,
                    senderId: userId,
                    receiverId: toId,
                    amount: qty,
                    totalPrice: totalCost,
                },
            }),
            prisma.directMessage.create({
                data: {
                    fromId: userId,
                    toId,
                    giftId: gift.id,
                    text: null,
                },
            }),
        ]);

        // Ensure conversation exists for both sides
        await Promise.all([
            prisma.conversation.upsert({
                where: { userId_otherUserId: { userId, otherUserId: toId } },
                create: { userId, otherUserId: toId },
                update: { updatedAt: new Date(), isDeleted: false },
            }),
            prisma.conversation.upsert({
                where: { userId_otherUserId: { userId: toId, otherUserId: userId } },
                create: { userId: toId, otherUserId: userId },
                update: { updatedAt: new Date(), isDeleted: false },
            }),
        ]);

        return NextResponse.json({
            status: true,
            message: 'Hediye gönderildi',
            data: {
                message_id: directMessage.id,
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
                    receiver_id: String(toId),
                    receiver_name: receiver?.fullName || receiver?.username || '',
                },
            },
        });
    } catch (error: any) {
        console.error('Gift send-user error:', error);
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
