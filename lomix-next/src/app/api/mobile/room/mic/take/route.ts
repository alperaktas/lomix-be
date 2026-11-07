import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { getRoomRole, canUseMic } from '@/lib/room-permissions';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/mic/take:
 *   post:
 *     summary: Mic slotu al (Direkt — Üye veya memberOnlyMic kapalıysa herkes)
 *     description: |
 *       memberOnlyMic=false: Tüm katılımcılar boş slot alabilir.
 *       memberOnlyMic=true: Sadece oda üyeleri, adminler ve sahip alabilir. Ziyaretçiler 403 alır.
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, slotIndex]
 *             properties:
 *               roomId:
 *                 type: string
 *               slotIndex:
 *                 type: integer
 *                 description: Alınmak istenen slot numarası
 *     responses:
 *       200:
 *         description: Mic alındı
 *       403:
 *         description: Yetersiz yetki veya slot dolu/kilitli
 *       404:
 *         description: Oda veya slot bulunamadı
 */
class SlotTakenError extends Error {}

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { roomId, slotIndex } = await request.json();
        if (!roomId || slotIndex === undefined) {
            return ApiResponseHelper.error("roomId ve slotIndex zorunludur.", 400);
        }

        const numericId = Number(roomId);
        const where = { OR: [{ roomId: String(roomId) }, ...(!isNaN(numericId) ? [{ id: numericId }] : [])] };
        const room = await prisma.room.findFirst({ where });
        if (!room) return ApiResponseHelper.error("Oda bulunamadı.", 404);

        // Odada olup olmadığını kontrol et
        const isParticipant = await prisma.roomParticipant.findUnique({
            where: { roomId_userId: { roomId: room.id, userId } },
        });
        if (!isParticipant) {
            return ApiResponseHelper.error("Önce odaya katılmanız gerekiyor.", 403);
        }

        const userInfo = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, fullName: true, avatar: true },
        });

        // memberOnlyMic kontrolü
        const myRole = await getRoomRole(room.id, userId, room.ownerId);
        if (!canUseMic(myRole, room.memberOnlyMic)) {
            return ApiResponseHelper.error(
                "Bu odada sadece üyeler mikrofona çıkabilir. Önce üye olmanız gerekiyor.",
                403
            );
        }

        const slot = await prisma.roomMicSlot.findUnique({
            where: { roomId_slotIndex: { roomId: room.id, slotIndex: Number(slotIndex) } },
        });
        if (!slot) return ApiResponseHelper.error("Mic slot bulunamadı.", 404);
        if (slot.isLocked) return ApiResponseHelper.error("Bu mic slotu kilitli.", 403);
        if (slot.userId !== null && slot.userId !== userId) {
            return ApiResponseHelper.error("Bu mic slotu başkası tarafından kullanılıyor.", 409);
        }

        // Aynı kullanıcının eşzamanlı istekleri (çift dokunma, aynı hesabın iki cihazı) sıraya girer; yoksa ikisi de
        // "eski yuvam yok" görüp kullanıcı iki yuvada kalıyordu. Kullanıcı başka bir slottaysa oradan alınır ve eski
        // yuvanın numarası döner (yoksa yuva değiştirenler eski yuvada "hayalet" olarak görünüyordu).
        const taken = await prisma.$transaction(async tx => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(${room.id}::int, ${userId}::int)`;

            const previous = await tx.roomMicSlot.findFirst({
                where: { roomId: room.id, userId, NOT: { id: slot.id } },
                select: { slotIndex: true },
            });
            await tx.roomMicSlot.updateMany({ where: { roomId: room.id, userId, NOT: { id: slot.id } }, data: { userId: null } });

            // Yuva hâlâ boş (ya da zaten bu kullanıcının) ise alınır; başkası arada aldıysa hiçbir şey değişmez.
            const claimed = await tx.roomMicSlot.updateMany({
                where: { id: slot.id, isLocked: false, OR: [{ userId: null }, { userId }] },
                data: { userId },
            });
            if (claimed.count === 0) throw new SlotTakenError();
            return { previousSlotIndex: previous ? previous.slotIndex : null };
        }).catch(e => {
            if (e instanceof SlotTakenError) return null;
            throw e;
        });
        if (!taken) return ApiResponseHelper.error("Bu mic slotu başkası tarafından kullanılıyor.", 409);
        const { previousSlotIndex } = taken;

        logRoomEvent(room.id, userId, 'MIC_TAKEN', null, String(slotIndex));

        return ApiResponseHelper.success({
            slotIndex: Number(slotIndex),
            previousSlotIndex,
            userId: String(userId),
            rtm_event: {
                type: 'MIC_TAKEN',
                slotIndex: Number(slotIndex),
                // Doluysa kullanıcı bu yuvadan taşındı: istemci eski yuvayı boşaltmalı.
                previousSlotIndex,
                userId: String(userId),
                username: userInfo?.fullName || userInfo?.username || '',
                avatarUrl: userInfo?.avatar || '',
            },
        }, "Mikrofon alındı.");
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
