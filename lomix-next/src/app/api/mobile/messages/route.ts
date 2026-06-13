import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { formatDmTime } from '@/lib/dm-time';

/**
 * @swagger
 * /api/mobile/messages:
 *   get:
 *     summary: DM Gelen Kutusu
 *     tags: [Mobile Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mesajlar başarıyla getirildi
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const conversations = await prisma.conversation.findMany({
            where: { userId, isDeleted: false },
            orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
            include: {
                otherUser: { select: { id: true, fullName: true, username: true, avatar: true, level: true } },
            },
        });

        const result = await Promise.all(conversations.map(async (conv) => {
            const otherUserId = conv.otherUserId;

            const lastMessage = await prisma.directMessage.findFirst({
                where: {
                    OR: [
                        { fromId: userId, toId: otherUserId },
                        { fromId: otherUserId, toId: userId },
                    ],
                    ...(conv.clearedAt ? { createdAt: { gt: conv.clearedAt } } : {}),
                },
                orderBy: { createdAt: 'desc' },
                include: { gift: { select: { name: true } } },
            });

            const unreadCount = await prisma.directMessage.count({
                where: {
                    fromId: otherUserId,
                    toId: userId,
                    isRead: false,
                    ...(conv.clearedAt ? { createdAt: { gt: conv.clearedAt } } : {}),
                },
            });

            // tik_no: 1=sent, 2=delivered(default), 3=read
            const tikNo = lastMessage?.fromId === userId
                ? (lastMessage.isRead ? 3 : 2)
                : 1;

            return {
                id: String(conv.otherUserId),
                user_id: String(conv.otherUserId),
                user_name: conv.otherUser.fullName || conv.otherUser.username,
                user_avatar: conv.otherUser.avatar || '',
                user_level: conv.otherUser.level,
                last_message: lastMessage?.text || (lastMessage?.gift ? `🎁 ${lastMessage.gift.name}` : lastMessage?.imageUrl ? '📷 Fotoğraf' : ''),
                message: lastMessage?.text || (lastMessage?.gift ? `🎁 ${lastMessage.gift.name}` : lastMessage?.imageUrl ? '📷 Fotoğraf' : ''),
                time: lastMessage ? formatDmTime(lastMessage.createdAt) : '',
                new_message_count: unreadCount,
                last_message_tik_no: tikNo,
                is_pinned: conv.isPinned,
            };
        }));

        return ApiResponseHelper.success(result, "Mesajlar başarıyla getirildi");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
