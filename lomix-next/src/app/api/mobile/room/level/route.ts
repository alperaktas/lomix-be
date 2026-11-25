import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/room/level:
 *   post:
 *     summary: Oda seviyesi ekranı verileri
 *     description: |
 *       `currentLevel` odanın seviyesi (tanımlı değilse 0), `currentXp` odada kişilere gönderilen hediyelerin toplam coin değeri,
 *       `nextLevelXp` bir sonraki seviyenin gerektirdiği toplam (son seviyedeyse ya da seviye tanımlı değilse mevcut değere eşit,
 *       ilerleme çubuğu dolu görünür). Seviye basamakları admin panelinden (Odalar > Oda Seviyeleri) tanımlanır.
 *       `privileges` şimdilik boş liste döner.
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId]
 *             properties:
 *               roomId:
 *                 type: string
 *     responses:
 *       200:
 *         description: data.roomId, currentLevel, currentXp, nextLevelXp, roomAvater, privileges
 *       404:
 *         description: Oda bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return NextResponse.json({ status: false, success: false, message: 'Yetkisiz erişim.' }, { status: 401 });

        const body = await request.json().catch(() => null);
        const roomId = body?.roomId;
        if (!roomId) return NextResponse.json({ status: false, success: false, message: 'roomId zorunludur.' }, { status: 400 });

        const room = await prisma.room.findUnique({
            where: { roomId: String(roomId) },
            select: { roomId: true, level: true, giftTotal: true, thumbnailUrl: true },
        });
        if (!room) return NextResponse.json({ status: false, success: false, message: 'Oda bulunamadı.' }, { status: 404 });

        const currentLevel = room.level ?? 0;
        const next = await prisma.roomLevelThreshold.findFirst({
            where: { level: { gt: currentLevel } },
            orderBy: { level: 'asc' },
            select: { requiredGifts: true },
        });
        // Sonraki seviye yoksa çubuk dolu görünsün (0'a bölme olmasın)
        const nextLevelXp = next ? next.requiredGifts : Math.max(room.giftTotal, 1);

        return NextResponse.json({
            status: true,
            success: true,
            message: 'Oda seviyesi getirildi.',
            data: {
                roomId: room.roomId,
                currentLevel,
                currentXp: room.giftTotal,
                nextLevelXp,
                roomAvater: room.thumbnailUrl || '',
                privileges: [],
            },
        });
    } catch (error: any) {
        console.error('room/level error:', error);
        return NextResponse.json({ status: false, success: false, message: 'Beklenmeyen bir hata oluştu.' }, { status: 500 });
    }
}
