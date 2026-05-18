import { ApiResponseHelper } from '@/lib/api-response';
import { generateChatToken, registerAgoraChatUser } from '@/lib/agora';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/room/chat-token:
 *   post:
 *     summary: Agora Chat token al
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat token döndürüldü
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const chatUserId = String(userId);
        await registerAgoraChatUser(chatUserId);
        const chatToken = generateChatToken(chatUserId);

        return ApiResponseHelper.success({
            chat_token: chatToken,
            chat_uid: chatUserId,
            app_id: process.env.NEXT_PUBLIC_AGORA_APP_ID,
            app_key: process.env.AGORA_CHAT_APP_KEY,
        }, "Chat token oluşturuldu.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
