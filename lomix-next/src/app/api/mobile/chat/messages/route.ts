import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { formatDmTime } from '@/lib/dm-time';

/**
 * @swagger
 * /api/mobile/chat/messages:
 *   get:
 *     summary: İki Kullanıcı Arasındaki Mesajlar
 *     tags: [Mobile Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mesajlar başarıyla getirildi
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { searchParams } = new URL(request.url);
        const otherUserId = Number(searchParams.get('user_id'));
        if (!otherUserId) return ApiResponseHelper.error("user_id zorunludur.", 400);

        // Get cleared_at for this conversation (messages before this are hidden)
        const conv = await prisma.conversation.findUnique({
            where: { userId_otherUserId: { userId, otherUserId } },
            select: { clearedAt: true },
        });

        const messages = await prisma.directMessage.findMany({
            where: {
                OR: [
                    { fromId: userId, toId: otherUserId },
                    { fromId: otherUserId, toId: userId },
                ],
                ...(conv?.clearedAt ? { createdAt: { gt: conv.clearedAt } } : {}),
            },
            orderBy: { createdAt: 'asc' },
        });

        // Mark messages from other user as read
        await prisma.directMessage.updateMany({
            where: { fromId: otherUserId, toId: userId, isRead: false },
            data: { isRead: true },
        });

        return ApiResponseHelper.success(
            messages.map(m => ({
                id: String(m.id),
                text: m.text,
                imageUrl: m.imageUrl,
                time: formatDmTime(m.createdAt),
                isMe: m.fromId === userId,
            })),
            "Mesajlar başarıyla getirildi"
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
