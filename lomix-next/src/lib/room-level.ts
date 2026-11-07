import prisma from '@/lib/prisma';

/**
 * Oda seviyesi, odada kişilere gönderilen hediyelerin toplam coin değerine (`rooms.gift_total`) göre belirlenir.
 * Baremler admin panelinde (`room_level_thresholds`) tanımlanır. Seviye yalnızca yükselir, düşmez.
 * Hiç barem yoksa seviyeye dokunulmaz (null kalır, mobilde "X"); barem varsa ve hiçbiri karşılanmıyorsa 0.
 */
export function roomLevelFor(thresholds: { level: number; requiredGifts: number }[], total: number): number | null {
    if (thresholds.length === 0) return null;
    let level = 0;
    for (const t of thresholds) {
        if (t.requiredGifts <= total && t.level > level) level = t.level;
    }
    return level;
}

/** Odaya gönderilen hediye tutarını sayaca yazar ve gerekiyorsa seviyeyi yükseltir. Güncel seviyeyi döner. */
export async function addRoomGift(roomDbId: number, coins: number): Promise<number | null> {
    const [room, thresholds] = await Promise.all([
        prisma.room.update({ where: { id: roomDbId }, data: { giftTotal: { increment: coins } }, select: { giftTotal: true, level: true } }),
        prisma.roomLevelThreshold.findMany({ orderBy: { level: 'asc' } }),
    ]);
    const computed = roomLevelFor(thresholds, room.giftTotal);
    if (computed !== null && computed > (room.level ?? -1)) {
        await prisma.room.update({ where: { id: roomDbId }, data: { level: computed } });
        return computed;
    }
    return room.level;
}

/**
 * Tüm odaların sayacını gift_logs'tan yeniden kurar (kaynak gerçek budur) ve seviyeleri yükseltir.
 * Baremler değişince ve ilk kurulumda çağrılır. Hiçbir oda seviyesi düşmez.
 */
export async function recalcAllRoomLevels(): Promise<{ rooms: number; raised: number }> {
    await prisma.$executeRaw`
        UPDATE rooms r SET gift_total = COALESCE((SELECT SUM(g.total_price) FROM gift_logs g WHERE g.room_id = r.id), 0)::int
    `;
    const thresholds = await prisma.roomLevelThreshold.findMany({ orderBy: { level: 'asc' } });
    const rooms = await prisma.room.findMany({ select: { id: true, giftTotal: true, level: true } });
    let raised = 0;
    for (const room of rooms) {
        const computed = roomLevelFor(thresholds, room.giftTotal);
        if (computed !== null && computed > (room.level ?? -1)) {
            await prisma.room.update({ where: { id: room.id }, data: { level: computed } });
            raised++;
        }
    }
    return { rooms: rooms.length, raised };
}
