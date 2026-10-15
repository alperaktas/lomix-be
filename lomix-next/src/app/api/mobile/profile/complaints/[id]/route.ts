import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { readComplaintRequest, serializeComplaint } from '@/lib/complaints';
import { MESSAGES_PER_MINUTE, THREAD_LIMIT, buildThread, parseMessageBody, serializeMessage } from '@/lib/complaint-thread';

type Ctx = { params: Promise<{ id: string }> };

const OWNER_SELECT = { id: true, username: true, fullName: true, avatar: true } as const;

function parseId(raw: string): number | null {
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
}

/** Kullanıcının kendi talebine yeni mesaj eklemesi. */
async function postMessage(userId: number, complaintId: number, body: unknown) {
    const complaint = await prisma.complaint.findFirst({
        where: { id: complaintId, userId },
        select: { id: true, status: true, user: { select: OWNER_SELECT } },
    });
    if (!complaint) return ApiResponseHelper.error("Talep bulunamadı.", 404);
    if (complaint.status === 'completed') {
        return ApiResponseHelper.error("Tamamlanmış taleplere mesaj gönderilemez.", 422, null);
    }

    const parsed = parseMessageBody(body);
    if ('error' in parsed) return ApiResponseHelper.error(parsed.error, 400, null);

    const recent = await prisma.complaintMessage.count({
        where: {
            senderType: 'user',
            complaint: { userId },
            createdAt: { gt: new Date(Date.now() - 60 * 1000) },
        },
    });
    if (recent >= MESSAGES_PER_MINUTE) {
        return ApiResponseHelper.error("Çok hızlı mesaj gönderiyorsunuz, lütfen biraz bekleyin.", 429, null);
    }

    const created = await prisma.complaintMessage.create({
        data: {
            complaintId,
            senderType: 'user',
            senderId: userId,
            content: parsed.content,
            imageUrls: parsed.imageUrls,
        },
    });

    return ApiResponseHelper.success(serializeMessage(created, complaint.user), "Mesajınız gönderildi.", 201);
}

/**
 * @swagger
 * /api/mobile/profile/complaints/{id}:
 *   get:
 *     summary: Talep detayı
 *     description: |
 *       Başka kullanıcıya ait ya da olmayan talep için 404 döner. `messages` konuşma akışıdır, zamana göre
 *       artan: ilk kayıt her zaman talebin kendisidir (`description` + resimler, kimliği negatif talep
 *       numarası), ardından kullanıcı (`sender_type: user`) ve destek ekibi (`support`) mesajları gelir.
 *       `reply` / `reply_at` geriye uyumluluk için en son destek cevabını verir (yoksa null).
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Talep detayı
 *       404:
 *         description: Talep bulunamadı
 *   post:
 *     summary: Talebi güncelle / talebe mesaj gönder
 *     description: |
 *       Aynı adrese iki iş gelir ve gövdeye göre ayrılır: gövdede `content` alanı varsa **yeni konuşma
 *       mesajı** gönderilir (JSON: `content` zorunlu, `image_urls` opsiyonel en fazla 5 yüklenmiş resim adresi).
 *       Yanıt 201 ve oluşturulan mesaj kaydıdır (`id`, `sender_type`, `sender`, `content`, `image_url(s)`,
 *       `created_at`, `read_at`). Tamamlanmış talebe 422, boş metin 400, dakikada 10'dan fazla mesaj 429
 *       döner; hata yanıtlarında `data: null`. `content` yoksa aşağıdaki talep güncelleme akışı çalışır.
 *
 *       Güncelleme: category ve description güncellenir. Resim alanı (image_url / image_urls / dosya) gönderilirse
 *       resimler yeni listeyle değiştirilir, hiç gönderilmezse korunur; silmek için `image_urls: []`.
 *       Gövde JSON ya da multipart olabilir (bkz. POST /complaints). Yalnızca kendi talebiniz ve durumu `completed`
 *       olmayan talepler değiştirilebilir. Tamamlanmış talep için 409 döner. Durum kontrolü
 *       güncellemeyle aynı sorguda yapıldığından tamamlanma ile güncelleme yarışında da
 *       tamamlanmış talep değişmez.
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, description]
 *             properties:
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Talep güncellendi
 *       400:
 *         description: Doğrulama hatası
 *       404:
 *         description: Talep bulunamadı
 *       409:
 *         description: Tamamlanmış talep değiştirilemez
 */
export async function GET(request: Request, { params }: Ctx) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const id = parseId((await params).id);
        if (!id) return ApiResponseHelper.error("Talep bulunamadı.", 404);

        const item = await prisma.complaint.findFirst({
            where: { id, userId },
            include: { user: { select: OWNER_SELECT } },
        });
        if (!item) return ApiResponseHelper.error("Talep bulunamadı.", 404);

        // En yeni THREAD_LIMIT mesaj alınır, artan sıraya çevrilir.
        const recent = await prisma.complaintMessage.findMany({
            where: { complaintId: id },
            orderBy: { createdAt: 'desc' },
            take: THREAD_LIMIT,
        });
        const messages = recent.reverse();
        const lastSupport = [...messages].reverse().find(m => m.senderType === 'support');

        return ApiResponseHelper.success({
            ...serializeComplaint(item),
            // Geriye uyumluluk: en son destek cevabı
            reply: lastSupport?.content ?? null,
            reply_at: lastSupport ? lastSupport.createdAt.toISOString() : null,
            messages: buildThread(item, item.user, messages),
        }, "Talep getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function POST(request: Request, { params }: Ctx) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const id = parseId((await params).id);
        if (!id) return ApiResponseHelper.error("Talep bulunamadı.", 404);

        // Aynı adrese iki iş gelir: gövdede `content` varsa yeni konuşma mesajı, yoksa talep güncelleme.
        // Gövde klonlanıp okunur ki güncelleme akışı asıl isteği (JSON ya da multipart) aynen okuyabilsin.
        const isJson = (request.headers.get('content-type') || '').includes('application/json');
        const peek = isJson ? await request.clone().json().catch(() => null) : null;
        if (peek && typeof peek === 'object' && 'content' in peek) {
            return await postMessage(userId, id, peek);
        }

        const parsed = await readComplaintRequest(request);
        if ('error' in parsed) return ApiResponseHelper.error(parsed.error, 400);

        // Sahiplik ve "tamamlanmamış" koşulu güncellemenin kendi WHERE'inde: kontrol ile yazma arasında
        // talep tamamlansa bile bu sorgu 0 satır günceller.
        const result = await prisma.complaint.updateMany({
            where: { id, userId, status: { not: 'completed' } },
            data: {
                category: parsed.category,
                description: parsed.description,
                // Resim alanı hiç gönderilmediyse mevcut resimler korunur.
                ...(parsed.images !== null && { imageUrls: parsed.images }),
            },
        });

        if (result.count === 0) {
            const current = await prisma.complaint.findFirst({ where: { id, userId }, select: { status: true } });
            if (!current) return ApiResponseHelper.error("Talep bulunamadı.", 404);
            return ApiResponseHelper.error("Tamamlanmış talep güncellenemez.", 409);
        }

        const updated = await prisma.complaint.findFirst({ where: { id, userId } });
        return ApiResponseHelper.success(serializeComplaint(updated!), "Talep güncellendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
