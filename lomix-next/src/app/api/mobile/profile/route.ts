import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/profile:
 *   get:
 *     summary: Kullanıcı profil bilgilerini getir
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil bilgileri
 */
export async function GET() {
    return NextResponse.json({
        "status": "success",
        "data": {
            "user_info": {
                "id": "00458547",
                "username": "Gina Ajans",
                "avatar_url": "/img/avatars/default.png",
                "is_verified": true,
                "gender": "male",
                "level": 32,
                "prestige_points": 12
            },
            "social_stats": {
                "following": 34,
                "friends": 26,
                "followers": 1198
            },
            "wallet": {
                "balance": 8342,
                "currency_symbol": "$",
                "has_deposit_reward": true,
                "is_vip": true,
                "vip_text": "LÜX AYRICALIKLAR"
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
}
