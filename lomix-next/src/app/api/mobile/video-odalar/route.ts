import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST() {
    try {
        const videoRooms = await prisma.room.findMany({
            where: {
                isLive: true,
                type: "video"
            },
            include: {
                owner: true,
                tags: true
            },
            orderBy: {
                viewerCount: 'desc'
            }
        });

        const banners = await prisma.roomBanner.findMany({
            where: { isActive: true },
            take: 3
        });

        return NextResponse.json({
            status: true,
            message: "Video odaları başarıyla getirildi",
            data: {
                banners: banners.map(b => ({
                    id: b.id,
                    title: b.title,
                    image_url: b.imageUrl,
                    background_colors: ["#1A237E", "#000000"] // Placeholder for dynamic colors
                })),
                video_rooms: videoRooms.map(room => ({
                    id: String(room.roomId),
                    name: room.owner?.fullName || room.owner?.username,
                    image: room.thumbnailUrl || "https://picsum.photos/400/200",
                    level: room.owner?.level || 1,
                    tag: room.tags[0]?.text || "Genel"
                }))
            }
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
