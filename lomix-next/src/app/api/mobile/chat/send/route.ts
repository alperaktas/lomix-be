import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getSetting } from '@/lib/app-settings';
import { decideBilling, refundExpiredEscrows, releaseEscrowsOnReply } from '@/lib/message-billing';
import { uploadChatMedia } from '@/lib/chat-media';

/**
 * @swagger
 * /api/mobile/chat/send:
 *   post:
 *     summary: Direkt Mesaj Gönder
 *     description: |
 *       Mesaj ücretlendirmesi burada işler:
 *       - Arkadaşlar (karşılıklı takip) arasında ücret alınmaz (`friend_message_free` ayarı ile kapatılabilir).
 *       - Yayıncının `hi` / `auto` mesajları günlük hak (`broadcaster_free_daily_messages`) dahilinde ücretsizdir.
 *       - Karşı taraf sohbete daha önce cevap yazmışsa yayıncı ücretsiz yazar.
 *       - Diğer durumlarda gönderenden `message_price` kadar coin düşer. Alıcı yayıncıysa coin
 *         havuzda bekler (`message_escrows`); yayıncı cevap yazınca komisyon düşülerek elmasa çevrilir,
 *         `message_escrow_timeout_hours` içinde cevap gelmezse coin gönderene iade edilir.
 *       - Cevap gelmeden art arda en fazla `max_unanswered_messages` mesaj gönderilebilir.
 *       Yanıttaki `billing` alanı ne olduğunu söyler (`charged`, `free`, `escrow_held`).
 *
 *       İki gönderim şekli desteklenir:
 *       - `application/json`: `image_url`/`file_url` önceden `/api/mobile/upload` ile yüklenmiş bir URL taşır.
 *       - `multipart/form-data`: dosya doğrudan `file` alanında gönderilir, endpoint kendi yükler
 *         (resimse `image_url`'e, ses/diğerse `file_url`+`file_type`'a otomatik atanır — `file_type`
 *         alanı gönderilmezse MIME türünden çıkarılır).
 *     tags: [Mobile Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: integer
 *               text:
 *                 type: string
 *               image_url:
 *                 type: string
 *                 description: Geriye dönük uyumluluk için ayrı tutulur, resim mesajlarında kullanılmaya devam eder.
 *               file_url:
 *                 type: string
 *                 description: Ses veya diğer dosya tipleri için (önce /api/mobile/upload ile yüklenir). file_type ile birlikte gönderilir.
 *               file_type:
 *                 type: string
 *                 enum: [audio, file]
 *                 description: file_url gönderiliyorsa zorunlu.
 *               kind:
 *                 type: string
 *                 enum: [user, hi, auto]
 *                 description: 'Varsayılan user. hi/auto yalnızca yayıncılar için, günlük ücretsiz haktan düşer.'
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: integer
 *               text:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Resim, ses (mp3/m4a/aac/wav/ogg/webm/3gpp) veya pdf. Sunucu yükleyip URL'i mesaja bağlar.
 *               file_type:
 *                 type: string
 *                 enum: [audio, file]
 *                 description: Opsiyonel, verilmezse dosyanın MIME türünden çıkarılır.
 *               kind:
 *                 type: string
 *                 enum: [user, hi, auto]
 *     responses:
 *       200:
 *         description: Mesaj gönderildi
 *       400:
 *         description: Eksik parametre veya yetersiz bakiye
 *       403:
 *         description: İzin yok
 *       404:
 *         description: Kullanıcı bulunamadı
 *       429:
 *         description: Cevapsız mesaj limiti veya günlük ücretsiz hak doldu
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        let user_id: any, text: string | null, image_url: string | null, file_url: string | null, file_type: string | null, kind: string | null;

        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            user_id = formData.get('user_id');
            text = (formData.get('text') as string | null) || null;
            image_url = (formData.get('image_url') as string | null) || null;
            file_url = (formData.get('file_url') as string | null) || null;
            file_type = (formData.get('file_type') as string | null) || null;
            kind = (formData.get('kind') as string | null) || null;

            const file = formData.get('file');
            if (file && typeof file !== 'string') {
                const uploaded = await uploadChatMedia(file);
                if (!uploaded.ok) return ApiResponseHelper.error(uploaded.message, 400);
                if (uploaded.type.startsWith('image/')) {
                    image_url = uploaded.url;
                } else {
                    file_url = uploaded.url;
                    if (!['audio', 'file'].includes(file_type || '')) {
                        file_type = uploaded.type.startsWith('audio/') ? 'audio' : 'file';
                    }
                }
            }
        } else {
            const body = await request.json();
            user_id = body.user_id;
            text = body.text ?? null;
            image_url = body.image_url ?? null;
            file_url = body.file_url ?? null;
            file_type = body.file_type ?? null;
            kind = body.kind ?? null;
        }

        if (!user_id) return ApiResponseHelper.error("user_id zorunludur.", 400);
        if (!text?.trim() && !image_url && !file_url) {
            return ApiResponseHelper.error("text, image_url veya file_url (ya da dosya) zorunludur.", 400);
        }
        if (file_url && !['audio', 'file'].includes(file_type || '')) {
            return ApiResponseHelper.error("file_url gönderiliyorsa file_type 'audio' veya 'file' olmalıdır.", 400);
        }

        const toId = Number(user_id);
        if (isNaN(toId)) return ApiResponseHelper.error("Geçersiz user_id.", 400);
        if (toId === userId) return ApiResponseHelper.error("Kendinize mesaj gönderemezsiniz.", 400);

        const messageKind = ['hi', 'auto'].includes(String(kind)) ? String(kind) : 'user';

        const [sender, receiver] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { id: true, isBroadcaster: true } }),
            prisma.user.findUnique({ where: { id: toId }, select: { id: true, isBroadcaster: true } }),
        ]);
        if (!sender) return ApiResponseHelper.error("Yetkisiz erişim.", 401);
        if (!receiver) return ApiResponseHelper.error("Kullanıcı bulunamadı.", 404);

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
            return ApiResponseHelper.error(decision.message, decision.status, decision.data);
        }

        let billing: string = decision.kind === 'free' ? 'free' : 'charged';
        let coinAmount = 0;

        if (decision.kind === 'charge') {
            const wallet = await prisma.wallet.findUnique({ where: { userId } });
            const balance = wallet?.balance ?? 0;

            if (balance < decision.coinAmount) {
                return ApiResponseHelper.error("Yetersiz coin bakiyesi.", 400, {
                    required: decision.coinAmount,
                    balance,
                    missing: decision.coinAmount - balance,
                    error_code: 'INSUFFICIENT_BALANCE',
                });
            }

            coinAmount = decision.coinAmount;
        }

        const message = await prisma.directMessage.create({
            data: {
                fromId: userId,
                toId,
                text: text?.trim() || null,
                imageUrl: image_url || null,
                fileUrl: file_url || null,
                fileType: file_url ? file_type : null,
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
                ]);
                billing = 'escrow_held';
            } else {
                await prisma.wallet.update({ where: { userId }, data: { balance: { decrement: coinAmount } } });
            }
        }

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

        return ApiResponseHelper.success({
            id: String(message.id),
            kind: messageKind,
            billing,
            coin_spent: coinAmount,
            escrow_held: decision.kind === 'charge' && decision.escrow,
            earned_diamonds: release.diamonds,
            released_escrows: release.released,
        }, "Mesaj gönderildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
