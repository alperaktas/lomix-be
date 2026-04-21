import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/room/leave:
 *   post:
 *     summary: Odadan Ayrıl
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *             properties:
 *               roomId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Odadan başarıyla ayrıldınız
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const { roomId } = await request.json();
        if (!roomId) {
            return NextResponse.json({ status: false, message: "roomId zorunludur" }, { status: 400 });
        }

        const room = await prisma.room.findUnique({
            where: { roomId: String(roomId) },
            select: { id: true, viewerCount: true },
        });

        if (!room) {
            return NextResponse.json({ status: false, message: "Oda bulunamadı" }, { status: 404 });
        }

        // Katılımcıyı kaldır
        await prisma.roomParticipant.deleteMany({
            where: { roomId: room.id, userId },
        });

        // Mikrofon slotunu boşalt
        await prisma.roomMicSlot.updateMany({
            where: { roomId: room.id, userId },
            data: { userId: null, isMuted: false },
        });

        // Görüntüleyici sayısını düşür (0'ın altına inmesin)
        if (room.viewerCount > 0) {
            await prisma.room.update({
                where: { id: room.id },
                data: { viewerCount: { decrement: 1 } },
            });
        }

        return NextResponse.json({
            status: true,
            message: "Odadan ayrıldınız",
        });
    } catch (error: any) {
        console.error("Room leave error:", error);
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
