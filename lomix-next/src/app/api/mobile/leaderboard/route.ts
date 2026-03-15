import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

export async function GET(request: Request) {
    try {
        // Auth Kontrolü
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'anchor';
        const period = searchParams.get('period') || 'weekly';

        // En yüksek prestij puanına sahip kullanıcıları getir
        const topUsers = await prisma.user.findMany({
            orderBy: {
                prestigePoints: 'desc'
            },
            take: 18,
            select: {
                id: true,
                fullName: true,
                username: true,
                avatar: true,
                prestigePoints: true
            }
        });

        const formattedUsers = topUsers.map((user, index) => ({
            rank: index + 1,
            name: user.fullName || user.username,
            avatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
            score: formatScore(user.prestigePoints),
            id: String(user.id)
        }));

        return NextResponse.json({
            status: true,
            message: "Leaderboard fetched successfully",
            data: {
                type: type, // Parametreden gelen tip
                period: period, // Parametreden gelen periyot
                top_three: formattedUsers.slice(0, 3),
                others: formattedUsers.slice(3)
            }
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}

function formatScore(score: number): string {
    if (score >= 1000000) return (score / 1000000).toFixed(1) + 'm';
    if (score >= 1000) return (score / 1000).toFixed(1) + 'k';
    return String(score);
}
