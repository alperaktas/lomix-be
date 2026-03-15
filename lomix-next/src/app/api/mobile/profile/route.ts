import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallet: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                        friends1: true,
                        friends2: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ status: false, message: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            "status": "success",
            "data": {
                "user_info": {
                    "id": String(user.id).padStart(8, '0'),
                    "username": user.fullName || user.username,
                    "avatar_url": user.avatar || "/img/avatars/default.png",
                    "is_verified": user.isVerified,
                    "gender": user.gender || "unspecified",
                    "level": user.level,
                    "prestige_points": user.prestigePoints
                },
                "social_stats": {
                    "following": user._count.following,
                    "friends": user._count.friends1 + user._count.friends2,
                    "followers": user._count.followers
                },
                "wallet": {
                    "balance": user.wallet?.balance || 0,
                    "currency_symbol": user.wallet?.currencySymbol || "$",
                    "has_deposit_reward": user.wallet?.hasDepositReward || false,
                    "is_vip": user.isVip,
                    "vip_text": user.isVip ? "LÜX AYRICALIKLAR" : "STANDART"
                },
                "dashboard_tools": [
                    {
                        "id": "tool_diamond",
                        "title": "Elmas",
                        "icon_url": "/img/icons/diamond.png",
                        "action_route": "/diamonds"
                    },
                    {
                        "id": "tool_visitors",
                        "title": "Ziyaretçiler",
                        "icon_url": "/img/icons/visitors.png",
                        "action_route": "/visitors"
                    },
                    {
                        "id": "tool_tasks",
                        "title": "Görevler",
                        "icon_url": "/img/icons/tasks.png",
                        "action_route": "/tasks"
                    },
                    {
                        "id": "tool_family",
                        "title": "Aile",
                        "icon_url": "/img/icons/family.png",
                        "action_route": "/family"
                    }
                ],
                "games": [
                    {
                        "id": 101,
                        "name": "Car Tycoon",
                        "thumbnail_url": "/img/games/car_tycoon.png",
                        "action_url": "game://car_tycoon"
                    },
                    {
                        "id": 102,
                        "name": "LUDO",
                        "thumbnail_url": "/img/games/ludo.png",
                        "action_url": "game://ludo"
                    }
                ]
            }
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
