import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/mobile/recommended-users:
 *   get:
 *     summary: Önerilen kullanıcıları listele
 *     tags: [Mobile Social]
 *     responses:
 *       200:
 *         description: Kullanıcı listesi
 */
export async function GET() {
    try {
        // En yüksek prestij puanına veya en son eklenenlere göre önerilen kullanıcıları getirebiliriz
        const users = await prisma.user.findMany({
            take: 20,
            orderBy: {
                createdAt: 'desc', // default order
            },
            include: {
                rooms: {
                    where: {
                        isLive: true
                    },
                    take: 1
                }
            }
        });

        const formattedUsers = users.map(user => {
            return {
                name: user.fullName || user.username || 'Bilinmeyen Kullanıcı',
                image_url: user.avatar || 'https://i.pravatar.cc/150?img=' + (user.id % 70), // Fallback image if avatar is missing
                is_vip: user.isVip || false,
                action_type: (user.rooms && user.rooms.length > 0) ? 'chatRoom' : 'hi'
            };
        });

        return NextResponse.json(formattedUsers);
    } catch (error) {
        console.error('Error fetching recommended users:', error);
        return NextResponse.json(
            { error: 'Önerilen kullanıcılar alınırken bir hata oluştu.' },
            { status: 500 }
        );
    }
}
