import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/users/detail:
 *   post:
 *     summary: Kullanıcı Detayı
 *     description: Verilen userId'ye ait kullanıcının profil bilgilerini döner.
 *     tags: [Mobile Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri döndürüldü
 *       404:
 *         description: Kullanıcı bulunamadı
 */
export async function POST(request: Request) {
    try {
        const requesterId = await getCurrentUserId(request);
        if (!requesterId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { userId } = await request.json();
        if (!userId) return ApiResponseHelper.error("userId zorunludur.", 400);

        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            select: {
                id: true,
                username: true,
                fullName: true,
                avatar: true,
                gender: true,
                level: true,
                isVip: true,
                vipLevel: true,
                vipExpiresAt: true,
                prestigePoints: true,
                description: true,
                country: true,
                birthDate: true,
                nickname: true,
                createdAt: true,
            },
        });

        if (!user) return ApiResponseHelper.error("Kullanıcı bulunamadı.", 404);

        return ApiResponseHelper.success({
            id: String(user.id),
            username: user.username,
            full_name: user.fullName || user.username,
            avatar_url: user.avatar || null,
            gender: user.gender || null,
            level: user.level,
            is_vip: user.isVip,
            vip_level: user.vipLevel,
            vip_expires_at: user.vipExpiresAt || null,
            prestige_points: user.prestigePoints,
            description: user.description || null,
            country: user.country || null,
            birth_date: user.birthDate || null,
            nickname: user.nickname || null,
            created_at: user.createdAt,
        }, "Kullanıcı bilgileri getirildi.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
