import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/profile/me:
 *   get:
 *     summary: Giriş yapmış kullanıcının profil bilgilerini getirir
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
        include: { wallet: true }
    });

    if (!user) {
        return NextResponse.json({ message: "Kullanıcı bulunamadı" }, { status: 404 });
    }

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
                avatar_url: user.avatar || "https://api.domain.com/images/default.jpg",
                is_verified: user.isVerified || false,
                gender: user.gender || "unknown",
                level: user.level || 1,
                prestige_points: user.prestigePoints || 0
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
