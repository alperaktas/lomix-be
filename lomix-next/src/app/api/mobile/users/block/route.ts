import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/users/block:
 *   post:
 *     summary: Kullanıcıyı Engelle / Engeli Kaldır
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
 *         description: Kullanıcı başarıyla engellendi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { user_id } = await request.json();
        if (!user_id) return ApiResponseHelper.error("user_id zorunludur.", 400);

        const blockedId = Number(user_id);
        if (!blockedId || Number.isNaN(blockedId)) return ApiResponseHelper.error("Geçersiz user_id.", 400);
        if (blockedId === userId) return ApiResponseHelper.error("Kendinizi engelleyemezsiniz.", 400);

        const blockedUser = await prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
        if (!blockedUser) return ApiResponseHelper.error("Kullanıcı bulunamadı.", 404);

        const existing = await prisma.userBlock.findUnique({
            where: { userId_blockedId: { userId, blockedId } },
        });

        if (existing) {
            await prisma.userBlock.delete({ where: { userId_blockedId: { userId, blockedId } } });
            return ApiResponseHelper.success(null, "Engel kaldırıldı.");
        }

        await prisma.userBlock.create({ data: { userId, blockedId } });
        return ApiResponseHelper.success(null, "Kullanıcı başarıyla engellendi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
