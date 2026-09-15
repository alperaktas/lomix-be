import prisma from '@/lib/prisma';
import { getSetting } from '@/lib/app-settings';
import { orderedFriendPair } from '@/lib/profile-lists';

/**
 * Mesajlasma ucreti ve havuz (escrow) mantigi.
 *
 * Kural ozeti:
 * - Arkadaslar (karsilikli takip) arasinda ucret yok (friend_message_free ayari ile kapatilabilir).
 * - Yayincinin "hi"/"auto" mesajlari gunluk hak dahilinde ucretsiz.
 * - Karsi taraf sohbete daha once cevap yazdiysa yayinci ucretsiz yazar.
 * - Normal kullanici yayinciya yazarken her mesajda coin duser ve havuzda bekler.
 * - Yayinci cevap yazdiginda havuzdaki coinler komisyon dusulerek elmasa cevrilir.
 * - Cevap gelmezse sure sonunda coin odeyene iade edilir.
 * - Cevapsiz ardisik mesaj limiti asilirsa yeni mesaj gonderilemez.
 */

export type BillingDecision =
    | { kind: 'free'; reason: string }
    | { kind: 'charge'; coinAmount: number; escrow: boolean }
    | { kind: 'blocked'; message: string; status: number; data?: Record<string, any> };

export type BillingContext = {
    senderId: number;
    receiverId: number;
    senderIsBroadcaster: boolean;
    receiverIsBroadcaster: boolean;
    messageKind: string;
};

/** Suresi dolmus havuz kayitlarini odeyene iade eder. Cagrildigi her yerde tembel calisir. */
export async function refundExpiredEscrows(scope?: { payerId?: number; receiverId?: number }): Promise<number> {
    const expired = await prisma.messageEscrow.findMany({
        where: {
            status: 'held',
            expiresAt: { lt: new Date() },
            ...(scope?.payerId ? { payerId: scope.payerId } : {}),
            ...(scope?.receiverId ? { receiverId: scope.receiverId } : {}),
        },
        take: 200,
    });

    for (const escrow of expired) {
        await prisma.$transaction([
            prisma.wallet.upsert({
                where: { userId: escrow.payerId },
                update: { balance: { increment: escrow.coinAmount } },
                create: { userId: escrow.payerId, balance: escrow.coinAmount },
            }),
            prisma.messageEscrow.update({
                where: { id: escrow.id },
                data: { status: 'refunded', resolvedAt: new Date() },
            }),
        ]);
    }

    return expired.length;
}

/** Iki kullanici arkadas mi (karsilikli takipten dogan user_friends kaydi). */
export async function areFriends(a: number, b: number): Promise<boolean> {
    const pair = orderedFriendPair(a, b);
    const row = await prisma.userFriend.findUnique({ where: { user1Id_user2Id: pair } });
    return !!row;
}

/** Karsi taraf bu sohbette daha once yazmis mi. */
async function hasReplied(senderId: number, receiverId: number): Promise<boolean> {
    const reply = await prisma.directMessage.findFirst({
        where: { fromId: receiverId, toId: senderId },
        select: { id: true },
    });
    return !!reply;
}

/** Gonderenin, cevap almadan ust uste kac mesaj yazdigi. */
async function unansweredCount(senderId: number, receiverId: number): Promise<number> {
    const lastIncoming = await prisma.directMessage.findFirst({
        where: { fromId: receiverId, toId: senderId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
    });

    return prisma.directMessage.count({
        where: {
            fromId: senderId,
            toId: receiverId,
            ...(lastIncoming ? { createdAt: { gt: lastIncoming.createdAt } } : {}),
        },
    });
}

/** Yayincinin bugun kullandigi ucretsiz otomatik mesaj sayisi. */
async function freeMessagesUsedToday(broadcasterId: number): Promise<number> {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    return prisma.directMessage.count({
        where: {
            fromId: broadcasterId,
            kind: { in: ['hi', 'auto'] },
            createdAt: { gte: dayStart },
        },
    });
}

/** Mesaj gonderilmeden once ucret karari. */
export async function decideBilling(ctx: BillingContext): Promise<BillingDecision> {
    const [price, maxUnanswered, friendFree] = await Promise.all([
        getSetting('message_price'),
        getSetting('max_unanswered_messages'),
        getSetting('friend_message_free'),
    ]);

    // Hi / otomatik mesajlar: yalnizca yayinci, gunluk hak kadar, ucretsiz.
    if (ctx.messageKind === 'hi' || ctx.messageKind === 'auto') {
        if (!ctx.senderIsBroadcaster) {
            return { kind: 'blocked', message: 'Bu mesaj türünü yalnızca yayıncılar gönderebilir.', status: 403 };
        }

        const [used, quota] = await Promise.all([
            freeMessagesUsedToday(ctx.senderId),
            getSetting('broadcaster_free_daily_messages'),
        ]);

        if (used >= quota) {
            return {
                kind: 'blocked',
                message: 'Günlük ücretsiz mesaj hakkınız doldu.',
                status: 429,
                data: { free_quota: quota, free_used: used },
            };
        }

        return { kind: 'free', reason: 'broadcaster_free_quota' };
    }

    // Ardisik cevapsiz mesaj limiti (arkadaslar haric).
    const friends = await areFriends(ctx.senderId, ctx.receiverId);

    if (!friends && maxUnanswered > 0) {
        const pending = await unansweredCount(ctx.senderId, ctx.receiverId);
        if (pending >= maxUnanswered) {
            return {
                kind: 'blocked',
                message: `Cevap gelmeden en fazla ${maxUnanswered} mesaj gönderebilirsiniz.`,
                status: 429,
                data: { unanswered_count: pending, max_unanswered: maxUnanswered },
            };
        }
    }

    if (friends && friendFree === 1) {
        return { kind: 'free', reason: 'friends' };
    }

    // Karsi taraf sohbete katildiysa yayincidan ucret alinmaz, kazanmaya baslar.
    if (ctx.senderIsBroadcaster && await hasReplied(ctx.senderId, ctx.receiverId)) {
        return { kind: 'free', reason: 'broadcaster_active_conversation' };
    }

    if (price <= 0) {
        return { kind: 'free', reason: 'price_zero' };
    }

    // Havuz yalnizca alici yayinciysa isler; elmas kazanan taraf odur.
    return { kind: 'charge', coinAmount: price, escrow: ctx.receiverIsBroadcaster };
}

/**
 * Alici cevap yazdiginda, o kisiden bekleyen havuz kayitlarini elmasa cevirir.
 * Yalnizca alicinin yayinci oldugu kayitlar havuza girdigi icin burada rol kontrolu gerekmez.
 */
export async function releaseEscrowsOnReply(replierId: number, otherUserId: number): Promise<{ released: number; diamonds: number }> {
    const held = await prisma.messageEscrow.findMany({
        where: { receiverId: replierId, payerId: otherUserId, status: 'held', expiresAt: { gte: new Date() } },
    });

    if (held.length === 0) return { released: 0, diamonds: 0 };

    const commissionRate = await getSetting('message_commission_rate');
    let totalDiamonds = 0;

    for (const escrow of held) {
        const diamondAmount = Math.floor(escrow.coinAmount * (1 - commissionRate / 100));
        const commission = escrow.coinAmount - diamondAmount;
        totalDiamonds += diamondAmount;

        await prisma.$transaction([
            prisma.wallet.upsert({
                where: { userId: replierId },
                update: { diamonds: { increment: diamondAmount } },
                create: { userId: replierId, balance: 0, diamonds: diamondAmount },
            }),
            prisma.diamondTransaction.create({
                data: {
                    userId: replierId,
                    type: 'message_earning',
                    diamondAmount,
                    coinValue: escrow.coinAmount,
                },
            }),
            prisma.messageEscrow.update({
                where: { id: escrow.id },
                data: { status: 'released', diamondAmount, commission, resolvedAt: new Date() },
            }),
        ]);
    }

    return { released: held.length, diamonds: totalDiamonds };
}
