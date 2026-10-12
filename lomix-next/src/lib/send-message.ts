import prisma from '@/lib/prisma';
import { getSetting } from '@/lib/app-settings';
import { decideBilling, refundExpiredEscrows, releaseEscrowsOnReply } from '@/lib/message-billing';
import { spendOp, syncLevel, levelUpField } from '@/lib/level';

export type SendMessageInput = {
    senderId: number;
    receiverId: number;
    text: string | null;
    imageUrl: string | null;
    fileUrl: string | null;
    fileType: string | null;
    /** 'user' | 'hi' | 'auto' */
    kind: string;
};

export type SendMessageResult =
    | { ok: false; message: string; status: number; data?: any }
    | { ok: true; messageId: number; data: Record<string, any> };

/**
 * Direkt mesaj gönderme çekirdeği: ücret kararı, coin düşümü/havuz, mesaj kaydı, seviye,
 * havuz serbest bırakma ve Conversation kayıtları. chat/send ve Hi butonu aynı kuralları
 * paylaşsın diye burada; HTTP katmanı (gövde okuma, dosya yükleme) çağıranda kalır.
 */
export async function sendDirectMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const { senderId: userId, receiverId: toId, kind: messageKind } = input;

    const [sender, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, isBroadcaster: true } }),
        prisma.user.findUnique({ where: { id: toId }, select: { id: true, isBroadcaster: true } }),
    ]);
    if (!sender) return { ok: false, message: "Yetkisiz erişim.", status: 401 };
    if (!receiver) return { ok: false, message: "Kullanıcı bulunamadı.", status: 404 };

    // Suresi dolan havuz kayitlari once iade edilir ki bakiye hesabi dogru olsun.
    await refundExpiredEscrows({ payerId: userId });

    const decision = await decideBilling({
        senderId: userId,
        receiverId: toId,
        senderIsBroadcaster: sender.isBroadcaster,
        receiverIsBroadcaster: receiver.isBroadcaster,
        messageKind,
    });

    if (decision.kind === 'blocked') {
        return { ok: false, message: decision.message, status: decision.status, data: decision.data };
    }

    let billing: string = decision.kind === 'free' ? 'free' : 'charged';
    let coinAmount = 0;

    if (decision.kind === 'charge') {
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        const balance = wallet?.balance ?? 0;

        if (balance < decision.coinAmount) {
            return {
                ok: false,
                message: "Yetersiz coin bakiyesi.",
                status: 400,
                data: {
                    required: decision.coinAmount,
                    balance,
                    missing: decision.coinAmount - balance,
                    error_code: 'INSUFFICIENT_BALANCE',
                },
            };
        }

        coinAmount = decision.coinAmount;
    }

    const message = await prisma.directMessage.create({
        data: {
            fromId: userId,
            toId,
            text: input.text?.trim() || null,
            imageUrl: input.imageUrl || null,
            fileUrl: input.fileUrl || null,
            fileType: input.fileUrl ? input.fileType : null,
            kind: messageKind,
        },
    });

    if (decision.kind === 'charge') {
        const timeoutHours = await getSetting('message_escrow_timeout_hours');
        const expiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000);

        if (decision.escrow) {
            await prisma.$transaction([
                prisma.wallet.update({ where: { userId }, data: { balance: { decrement: coinAmount } } }),
                prisma.messageEscrow.create({
                    data: {
                        messageId: message.id,
                        payerId: userId,
                        receiverId: toId,
                        coinAmount,
                        expiresAt,
                    },
                }),
                spendOp(userId, coinAmount),
            ]);
            billing = 'escrow_held';
        } else {
            await prisma.$transaction([
                prisma.wallet.update({ where: { userId }, data: { balance: { decrement: coinAmount } } }),
                spendOp(userId, coinAmount),
            ]);
        }
    }

    const levelResult = decision.kind === 'charge' ? await syncLevel(userId) : null;

    // Bu mesaj ayni zamanda karsi tarafa verilmis bir cevap: bekleyen havuz varsa elmasa cevrilir.
    const release = await releaseEscrowsOnReply(userId, toId);

    // Iki taraf icin de Conversation kaydi dursun
    await prisma.conversation.upsert({
        where: { userId_otherUserId: { userId, otherUserId: toId } },
        create: { userId, otherUserId: toId, isDeleted: false },
        update: { isDeleted: false },
    });
    await prisma.conversation.upsert({
        where: { userId_otherUserId: { userId: toId, otherUserId: userId } },
        create: { userId: toId, otherUserId: userId, isDeleted: false },
        update: { isDeleted: false },
    });

    return {
        ok: true,
        messageId: message.id,
        data: {
            id: String(message.id),
            kind: messageKind,
            billing,
            coin_spent: coinAmount,
            escrow_held: decision.kind === 'charge' && decision.escrow,
            earned_diamonds: release.diamonds,
            released_escrows: release.released,
            ...levelUpField(levelResult),
        },
    };
}
