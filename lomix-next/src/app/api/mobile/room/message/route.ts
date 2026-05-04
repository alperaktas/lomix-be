import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/room/message:
 *   post:
 *     summary: Oda mesajını kaydet
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, message]
 *             properties:
 *               roomId:
 *                 type: string
 *               message:
 *                 type: string
 *               emoji:
 *                 type: string
 *   get:
 *     summary: Oda mesaj geçmişini getir
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId, message, emoji } = await request.json();
        if (!roomId || !message?.trim()) {
            return ApiResponseHelper.error("roomId ve message zorunludur.", 400);
        }

        const where = isNaN(Number(roomId))
            ? { roomId: String(roomId) }
            : { id: Number(roomId) };

        const room = await prisma.room.findFirst({ where, select: { id: true } });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        // Kelime filtresi kontrolü
        const wordFilters = await prisma.roomWordFilter.findMany({ select: { word: true } });
        const lowerMsg = message.toLowerCase();
        const blocked = wordFilters.find(f => lowerMsg.includes(f.word.toLowerCase()));
        if (blocked) return ApiResponseHelper.error("Mesajınız uygunsuz içerik barındırıyor.", 400);

        const saved = await prisma.roomMessage.create({
            data: { roomId: room.id, userId, message: message.trim(), emoji: emoji || null },
            include: {
                user: { select: { id: true, username: true, fullName: true, avatar: true, level: true } },
            },
        });

        return ApiResponseHelper.success({
            id: saved.id,
            message: saved.message,
            emoji: saved.emoji,
            createdAt: saved.createdAt,
            user: {
                id: saved.user.id,
                name: saved.user.fullName || saved.user.username,
                avatar: saved.user.avatar,
                level: saved.user.level,
            },
        }, "Mesaj kaydedildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        if (!roomId) return ApiResponseHelper.error("roomId zorunludur.", 400);

        const where = isNaN(Number(roomId))
            ? { roomId: String(roomId) }
            : { id: Number(roomId) };

        const room = await prisma.room.findFirst({ where, select: { id: true } });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        const messages = await prisma.roomMessage.findMany({
            where: { roomId: room.id },
            include: {
                user: { select: { id: true, username: true, fullName: true, avatar: true, level: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return ApiResponseHelper.success(
            messages.reverse().map(m => ({
                id: m.id,
                message: m.message,
                emoji: m.emoji,
                createdAt: m.createdAt,
                user: {
                    id: m.user.id,
                    name: m.user.fullName || m.user.username,
                    avatar: m.user.avatar,
                    level: m.user.level,
                },
            })),
            "Mesajlar getirildi."
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
