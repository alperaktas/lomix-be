import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/messages/pin:
 *   post:
 *     summary: Mesaj Kutusunu Sabitle / Sabitlemeden Kaldır
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
 *     responses:
 *       200:
 *         description: Mesaj kutusu en üste sabitlendi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { user_id } = await request.json();
        if (!user_id) return ApiResponseHelper.error("user_id zorunludur.", 400);

        const otherUserId = Number(user_id);

        const existing = await prisma.conversation.findUnique({
            where: { userId_otherUserId: { userId, otherUserId } },
        });

        const isPinned = !(existing?.isPinned ?? false);

        await prisma.conversation.upsert({
            where: { userId_otherUserId: { userId, otherUserId } },
            create: { userId, otherUserId, isPinned },
            update: { isPinned },
        });

        return ApiResponseHelper.success(
            { is_pinned: isPinned },
            isPinned ? "Mesaj kutusu en üste sabitlendi." : "Sabitleme kaldırıldı."
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
