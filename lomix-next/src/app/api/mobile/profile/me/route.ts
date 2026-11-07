import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { isGenderLocked } from '@/lib/gender';
import { userTypeFromRole } from '@/lib/roles';
import { latestApplicationSummary } from '@/lib/agency-application';

/**
 * @swagger
 * /api/mobile/profile/me:
 *   get:
 *     summary: Giriş yapmış kullanıcının profil bilgilerini getirir
 *     description: |
 *       `data.user.user_type` her zaman şu üç değerden biridir: `kullanıcı`, `yayıncı`, `ajans`. Tür kullanıcının
 *       **rolünden** gelir (admin panelinden değiştirilir): rolü `ajans` olan `ajans`, rolü `yayıncı` olan `yayıncı`,
 *       diğer her rol `kullanıcı`. Ajans sahibi olsa bile rolü `user` ise `kullanıcı` döner ve ajans ekranlarına girilemez.
 *       Ajans/yayıncı olarak eklenen kullanıcıların rolü otomatik güncellenir.
 *
 *       `data.user.agency_application`: kullanıcının **en son** ajans başvurusunun özeti (`application_id`, `status`,
 *       `status_text`, `rejected_by`, `agency`, `updated_at`), başvuru yoksa `null`. `status`: `pending`, `owner_approved`,
 *       `approved`, `rejected`. Fotoğraf ve iletişim bilgisi bu özette yoktur, ayrıntı için `agency/my_application`.
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil bilgileri
 */
export async function GET(request: Request) {
    const userId = await getCurrentUserId(request);

    if (!userId) {
        return NextResponse.json({ message: "Yetkisiz erişim" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            wallet: true,
        }
    });

    if (!user) {
        return NextResponse.json({ message: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Tür rolden gelir; rol ajans/yayıncı atanırken otomatik, istenirse panelden elle güncellenir.
    const userType = userTypeFromRole(user.role);

    const agency_application = await latestApplicationSummary(userId);
    const following_count = await prisma.userFollow.count({ where: { followerId: userId } });
    const followers_count = await prisma.userFollow.count({ where: { followingId: userId } });
    const friends_count = await prisma.userFriend.count({
        where: {
            OR: [{ user1Id: userId }, { user2Id: userId }]
        }
    });

    return NextResponse.json({
        success: true,
        message: "Profil bilgileri başarıyla getirildi.",
        data: {
            user: {
                id: String(user.id),
                username: user.username,
                full_name: user.fullName || user.username,
                avatar_url: user.avatar?.trim() || `${new URL(request.url).origin}/img/default-avatar.svg`,
                is_verified: user.isVerified || false,
                gender: user.gender || "unknown",
                gender_verified: user.genderVerified,
                // true ise cinsiyet seçilmiş: profil düzenlemede cinsiyet alanı kilitli gösterilmeli.
                gender_locked: isGenderLocked(user.gender),
                level: user.level ?? 0,
                prestige_points: user.prestigePoints || 0,
                user_type: userType,
                agency_application,
            },
            stats: {
                following_count,
                friends_count,
                followers_count
            },
            wallet: {
                balance: user.wallet?.balance || 0,
                currency: user.wallet?.currency || "USD",
                currency_symbol: user.wallet?.currencySymbol || "$",
                has_deposit_reward: user.wallet?.hasDepositReward || false,
                // Admin kapattıysa true: uygulama ilgili düğmeyi pasif gösterebilir.
                withdraw_blocked: user.withdrawBlocked,
                exchange_blocked: user.exchangeBlocked,
                spend_blocked: user.spendBlocked,
                vip_status: {
                    is_vip: user.isVip || false,
                    text: user.isVip ? "LÜX AYRICALIKLAR" : "STANDART"
                }
            },
            dashboard_tools: [
                {
                    id: "tool_diamond",
                    title: "Elmas",
                    icon_url: "https://.../diamond.png",
                    action_route: "/diamonds"
                }
            ]
        },
        meta: null
    });
}
