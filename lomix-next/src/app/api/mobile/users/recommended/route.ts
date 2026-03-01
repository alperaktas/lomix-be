import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/users/recommended:
 *   get:
 *     summary: Takip / arkadaş önerileri
 *     tags: [Mobile Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Önerilen kullanıcılar listelendi.
 */
export async function GET(request: Request) {
    const currentUserId = await getCurrentUserId(request);

    // Geçerli kullanıcıyı hariç tut, rastgele 10 kullanıcı önerisi
    const recommended = await prisma.user.findMany({
        where: currentUserId ? {
            id: { not: currentUserId },
            role: "user",
            status: "active"
        } : {
            role: "user",
            status: "active"
        },
        take: 10,
        orderBy: {
            createdAt: 'desc'
        }
    });

    return NextResponse.json({
        success: true,
        message: "Önerilen kullanıcılar listelendi.",
        data: recommended.map(r => ({
            id: String(r.id),
            name: r.fullName || r.username,
            avatar_url: r.avatar || "https://i.pravatar.cc/150",
            is_vip: r.isVip || false,
            interaction_type: "say_hi"
        }))
    });
}
