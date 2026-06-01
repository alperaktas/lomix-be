import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/chat/send:
 *   post:
 *     summary: Direkt Mesaj Gönder
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
 *     responses:
 *       200:
 *         description: Mesaj gönderildi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { user_id, text, image_url } = await request.json();
        if (!user_id) return ApiResponseHelper.error("user_id zorunludur.", 400);
        if (!text?.trim() && !image_url) return ApiResponseHelper.error("text veya image_url zorunludur.", 400);

        const toId = Number(user_id);

        const message = await prisma.directMessage.create({
            data: { fromId: userId, toId, text: text?.trim() || null, imageUrl: image_url || null },
        });

        // Ensure both sides have a Conversation record
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

        return ApiResponseHelper.success({ id: String(message.id) }, "Mesaj gönderildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
