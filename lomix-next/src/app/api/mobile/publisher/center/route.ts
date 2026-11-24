import { getCurrentUserId } from '@/lib/current-user';
import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { inAppEarningsSince, isStreamer, statsWindows } from '@/lib/publisher';

const TOOLS = [
    { key: 'tasks', title: 'Görevler', icon: 'description', action_route: '/tasks' },
    { key: 'room', title: 'Odam', icon: 'home_rounded', action_route: '/room' },
    { key: 'approval_center', title: 'Onay Merkezi', icon: 'verified', action_route: '/approval-center' },
];

/**
 * @swagger
 * /api/mobile/publisher/center:
 *   get:
 *     summary: Yayıncı merkezi ekranı verileri
 *     description: |
 *       Yalnızca onaylı yayıncılar için. Kullanıcı JWT'den tanınır. `stats` gelirleri **elmas** cinsindendir ve takvim
 *       bazlıdır (Türkiye saatiyle): `daily` bugün, `weekly` bu hafta (pazartesiden), `monthly` bu ay. `in_app_income`
 *       hediye ve mesaj kazançlarıdır (bonus/görev hariç), `task_income` görev sistemi gelene kadar 0'dır,
 *       `total_income` ikisinin toplamıdır. `room` kullanıcının kendi (kapatılmamış) odası, yoksa `null`.
 *       Yayıncı olmayana 403 `NOT_A_STREAMER`.
 *     tags: [Mobile Publisher]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: data.user_info, data.room, data.stats, data.tools
 *       401:
 *         description: Token geçersiz
 *       403:
 *         description: Yayıncı değil (error_code NOT_A_STREAMER)
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 401);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, fullName: true, avatar: true, level: true, prestigePoints: true, role: true, isBroadcaster: true },
        });
        if (!user) return ApiResponseHelper.error('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 401);
        if (!isStreamer(user)) {
            return ApiResponseHelper.error('Bu sayfaya yalnızca onaylı yayıncılar erişebilir.', 403, { error_code: 'NOT_A_STREAMER' });
        }

        const win = statsWindows();
        const [room, levelRow, daily, weekly, monthly] = await Promise.all([
            // Canlı oda öncelikli, yoksa en son açılan kapatılmamış oda
            prisma.room.findFirst({
                where: { ownerId: userId, isClosed: false },
                orderBy: [{ isLive: 'desc' }, { createdAt: 'desc' }],
                select: { roomId: true, name: true, thumbnailUrl: true, isLocked: true },
            }),
            prisma.levelThreshold.findUnique({ where: { level: user.level }, select: { name: true } }),
            inAppEarningsSince(userId, win.daily),
            inAppEarningsSince(userId, win.weekly),
            inAppEarningsSince(userId, win.monthly),
        ]);

        // Görev sistemi henüz yok: görev geliri 0
        const stat = (inApp: number) => ({ total_income: inApp, in_app_income: inApp, task_income: 0 });
        const origin = new URL(request.url).origin;

        return ApiResponseHelper.success({
            user_info: {
                id: String(user.id),
                username: user.fullName || user.username,
                avatar_url: user.avatar?.trim() || `${origin}/img/default-avatar.svg`,
                points: user.prestigePoints ?? 0,
                level_label: levelRow?.name?.trim() || `VIP${user.level}`,
                room_id: room ? room.roomId : null,
                room_name: room ? room.name : null,
            },
            room: room
                ? { id: room.roomId, name: room.name, cover_url: room.thumbnailUrl || null, is_locked: room.isLocked }
                : null,
            stats: { daily: stat(daily), weekly: stat(weekly), monthly: stat(monthly) },
            tools: TOOLS,
        }, 'Yayıncı merkezi verileri başarıyla getirildi.');
    } catch (error: any) {
        console.error('publisher/center error:', error);
        return ApiResponseHelper.error('Yayıncı bilgileri alınırken bir sunucu hatası oluştu.', 500);
    }
}
