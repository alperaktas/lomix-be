import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { sendDirectMessage } from '@/lib/send-message';

/**
 * @swagger
 * /api/mobile/users/update-action:
 *   post:
 *     summary: Kullanıcı Aksiyonunu Güncelle (Hi butonu)
 *     description: |
 *       Hi butonuna basılınca hedef kullanıcıyla action_type'ı chatRoom yapar ve admin panelinde
 *       tanımlı aktif Hi mesajlarından rastgele biri hedef kullanıcıya gönderilir. Mesaj normal
 *       mesaj kurallarına tabidir (arkadaşlar ücretsiz, diğerlerinden `message_price` coin düşer,
 *       cevapsız mesaj limiti geçerli). Mesaj gönderilemezse (örn. yetersiz bakiye, 400 + `error_code`)
 *       buton durumu değişmez. Aynı kişiye ikinci basışta mesaj tekrar gönderilmez. Aktif Hi mesajı
 *       tanımlı değilse yalnızca buton durumu güncellenir (`message_sent: false`).
 *     tags: [Mobile Users]
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
 *     responses:
 *       200:
 *         description: Aksiyon güncellendi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { user_id } = await request.json().catch(() => ({}));
        if (!user_id) return ApiResponseHelper.error("user_id zorunludur.", 400);

        const targetId = Number(user_id);
        if (!Number.isInteger(targetId) || targetId < 1) return ApiResponseHelper.error("Geçersiz user_id.", 400);
        if (targetId === userId) return ApiResponseHelper.error("Kendinize Hi gönderemezsiniz.", 400);

        const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
        if (!target) return ApiResponseHelper.error("Kullanıcı bulunamadı.", 404);

        const existing = await prisma.userInteraction.findUnique({
            where: { userId_targetId: { userId, targetId } },
            select: { actionType: true },
        });

        // Hi yalnızca ilk basışta mesaj gönderir; buton zaten chatRoom'a döndüyse tekrar ücret alınmaz.
        let sent: { id: string; text: string; billing: string; coin_spent: number; data: Record<string, any> } | null = null;
        if (existing?.actionType !== 'chatRoom') {
            const templates = await prisma.hiMessage.findMany({ where: { isActive: true }, select: { text: true } });

            if (templates.length > 0) {
                const text = templates[Math.floor(Math.random() * templates.length)].text;
                const result = await sendDirectMessage({
                    senderId: userId,
                    receiverId: targetId,
                    text,
                    imageUrl: null,
                    fileUrl: null,
                    fileType: null,
                    kind: 'user',
                });

                // Mesaj gitmediyse (bakiye, limit...) buton "Hi" olarak kalır, kullanıcı tekrar deneyebilir.
                if (!result.ok) return ApiResponseHelper.error(result.message, result.status, result.data);

                sent = { id: result.data.id, text, billing: result.data.billing, coin_spent: result.data.coin_spent, data: result.data };
            }
        }

        const interaction = await prisma.userInteraction.upsert({
            where: { userId_targetId: { userId, targetId } },
            create: { userId, targetId, actionType: 'chatRoom' },
            update: { actionType: 'chatRoom' },
        });

        return ApiResponseHelper.success({
            user_id: targetId,
            action_type: interaction.actionType,
            updated_at: interaction.updatedAt,
            message_sent: sent !== null,
            message_id: sent?.id ?? null,
            message: sent?.text ?? null,
            billing: sent?.billing ?? null,
            coin_spent: sent?.coin_spent ?? 0,
            ...(sent?.data.level_up ? { level_up: sent.data.level_up } : {}),
        }, "Kullanıcı aksiyonu başarıyla güncellendi");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
