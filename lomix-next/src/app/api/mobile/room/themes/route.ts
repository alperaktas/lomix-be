import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole, canUpdateRoomSettings } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

type ThemeRow = {
    themeId: string;
    name: string;
    imageUrl: string;
    gradientColors: number[];
    isVip: boolean;
    requiredVipLevel: number;
};

function formatTheme(theme: ThemeRow) {
    const base = {
        id: theme.themeId,
        name: theme.name,
        image_url: theme.imageUrl || "",
        gradient_colors: theme.gradientColors,
        is_vip: theme.isVip,
    };
    return theme.isVip ? { ...base, required_vip_level: theme.requiredVipLevel } : base;
}

/**
 * @swagger
 * /api/mobile/room/themes:
 *   get:
 *     summary: Oda temalarını listele
 *     description: |
 *       Oda temaları ve VIP temaları ayrı listeler halinde döner.
 *       Sadece `is_active` olan temalar listelenir, sıralama `sort_order` alanına göredir.
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Temalar başarıyla getirildi
 *       401:
 *         description: Yetkisiz erişim
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const themes = await prisma.roomTheme.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });

        return ApiResponseHelper.success(
            {
                room_themes: themes.filter(t => !t.isVip).map(formatTheme),
                vip_themes: themes.filter(t => t.isVip).map(formatTheme),
            },
            "Temalar başarıyla getirildi."
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

/**
 * @swagger
 * /api/mobile/room/themes:
 *   post:
 *     summary: Seçilen temayı odaya uygula (Sadece Oda Sahibi)
 *     description: |
 *       Tema `rooms.room_theme` alanına tema id'si olarak yazılır.
 *       VIP tema seçiliyorsa kullanıcının aktif VIP'i ve yeterli VIP seviyesi olması gerekir.
 *       Yanıttaki `rtm_event` odadaki istemcilere yayınlanmak içindir.
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [room_id, theme_id]
 *             properties:
 *               room_id:
 *                 type: string
 *                 description: Oda ID
 *               theme_id:
 *                 type: string
 *                 description: Tema ID (örn. room_1, vip_1)
 *     responses:
 *       200:
 *         description: Tema başarıyla uygulandı
 *       400:
 *         description: Eksik parametre
 *       403:
 *         description: Yetkisiz veya VIP seviyesi yetersiz
 *       404:
 *         description: Oda veya tema bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const body = await request.json().catch(() => ({}));
        const roomIdRaw = body.room_id ?? body.roomId;
        const themeIdRaw = body.theme_id ?? body.themeId;

        if (!roomIdRaw) return ApiResponseHelper.error("room_id zorunludur.", 400);
        if (!themeIdRaw) return ApiResponseHelper.error("theme_id zorunludur.", 400);

        const numericId = Number(roomIdRaw);
        const room = await prisma.room.findFirst({
            where: { OR: [{ roomId: String(roomIdRaw) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] },
        });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        const role = await getRoomRole(room.id, userId, room.ownerId);
        if (!canUpdateRoomSettings(role)) {
            return ApiResponseHelper.error("Temayı sadece oda sahibi değiştirebilir.", 403);
        }

        const theme = await prisma.roomTheme.findFirst({
            where: { themeId: String(themeIdRaw), isActive: true },
        });
        if (!theme) return ApiResponseHelper.error("Tema bulunamadı.", 404);

        if (theme.isVip) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { isVip: true, vipLevel: true, vipExpiresAt: true },
            });
            const vipActive = !!user?.isVip && (!user.vipExpiresAt || user.vipExpiresAt > new Date());
            if (!vipActive) {
                return ApiResponseHelper.error("Bu tema sadece VIP kullanıcılar içindir.", 403);
            }
            if ((user?.vipLevel ?? 0) < theme.requiredVipLevel) {
                return ApiResponseHelper.error(
                    `Bu tema için VIP ${theme.requiredVipLevel} seviyesi gerekiyor.`,
                    403
                );
            }
        }

        await prisma.room.update({
            where: { id: room.id },
            data: { roomTheme: theme.themeId },
        });

        logRoomEvent(room.id, userId, 'THEME_UPDATED', null, theme.themeId);

        return ApiResponseHelper.success(
            {
                success: true,
                message: "Tema başarıyla uygulandı",
                theme_id: theme.themeId,
                is_vip: theme.isVip,
                image_url: theme.imageUrl || "",
                gradient_colors: theme.gradientColors,
                rtm_event: {
                    type: 'THEME_UPDATED',
                    roomTheme: theme.themeId,
                    roomThemeUrl: theme.imageUrl || "",
                },
            },
            "Tema başarıyla uygulandı"
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
