import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { formatDmTime } from '@/lib/dm-time';
import { isOnline } from '@/lib/presence';
import { normalizeGender } from '@/lib/gender';

function previewText(message: { text: string | null; imageUrl: string | null; fileType: string | null; gift: { name: string } | null } | null): string {
    if (!message) return '';
    if (message.text) return message.text;
    if (message.gift) return `🎁 ${message.gift.name}`;
    if (message.fileType === 'audio') return '🎤 Sesli mesaj';
    if (message.fileType === 'file') return '📎 Dosya';
    if (message.imageUrl) return '📷 Fotoğraf';
    return '';
}

/**
 * @swagger
 * /api/mobile/messages:
 *   get:
 *     summary: DM Gelen Kutusu
 *     description: |
 *       Her sohbette karşı tarafın durumu `is_online` (boolean) ve `last_seen_at` (ISO tarih ya da null)
 *       olarak döner. Kullanıcı, uygulamadan doğrulanmış son isteğini son 5 dakika içinde yaptıysa online sayılır.
 *       `user_gender` karşı tarafın cinsiyetidir: `male`, `female` ya da belirtilmemişse `null`.
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
                otherUser: { select: { id: true, fullName: true, username: true, avatar: true, level: true, lastSeenAt: true, gender: true } },
            },
        });

        const now = Date.now();

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
                user_gender: normalizeGender(conv.otherUser.gender),
                is_online: isOnline(conv.otherUser.lastSeenAt, now),
                last_seen_at: conv.otherUser.lastSeenAt ? conv.otherUser.lastSeenAt.toISOString() : null,
                last_message: previewText(lastMessage),
                message: previewText(lastMessage),
                time: lastMessage ? formatDmTime(lastMessage.createdAt) : '',
                new_message_count: unreadCount,
                last_message_tik_no: tikNo,
                is_pinned: conv.isPinned,
                is_muted: conv.isMuted,
            };
        }));

        return ApiResponseHelper.success(result, "Mesajlar başarıyla getirildi");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
