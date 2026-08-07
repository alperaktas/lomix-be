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

        // En yüksek izleyici sayısına sahip canlı odaları getir
        const topRooms = await prisma.room.findMany({
            where: { isLive: true, isClosed: false },
            orderBy: { viewerCount: 'desc' },
            take: 18,
            select: {
                roomId: true,
                name: true,
                viewerCount: true,
                type: true,
                thumbnailUrl: true,
                owner: {
                    select: {
                        fullName: true,
                        username: true,
                        avatar: true,
                    }
                }
            }
        });

        const formattedRooms = topRooms.map((room, index) => ({
            rank: index + 1,
            room_id: room.roomId,
            room_name: room.name,
            owner_name: room.owner.fullName || room.owner.username,
            owner_avatar: room.owner.avatar || `https://i.pravatar.cc/150?u=${room.roomId}`,
            score: formatScore(room.viewerCount),
            viewer_count: room.viewerCount,
            type: room.type,
            thumbnail_url: room.thumbnailUrl || null,
        }));

        return NextResponse.json({
            status: true,
            message: "Leaderboard fetched successfully",
            data: {
                type: type,
                period: period,
                top_three: formattedRooms.slice(0, 3),
                others: formattedRooms.slice(3)
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
