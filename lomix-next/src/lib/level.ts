import prisma from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export function levelForSpend(thresholds: { level: number; requiredSpend: number }[], spent: number): number {
    let level = 0;
    for (const t of thresholds) {
        if (t.requiredSpend <= spent && t.level > level) level = t.level;
    }
    return level;
}

/**
 * Coin düşen işlemin transaction dizisine eklenir; toplam harcama sayacını artırır.
 * İade için negatif tutar verilir. Sayaç 0'ın altına inmez (sayaç öncesi harcamaların iadesi).
 */
export function spendOp(userId: number, amount: number) {
    return prisma.user.update({
        where: { id: userId },
        data: { totalSpent: { increment: amount } },
        select: { id: true, totalSpent: true },
    });
}

/**
 * Harcama işlemi bittikten sonra çağrılır: toplam harcamaya göre level'ı yükseltir.
 * Level asla düşmez (iade totalSpent'i düşürür ama level kalır); düşürmek için admin
 * panelindeki "yeniden hesapla" kullanılır.
 */
export async function syncLevel(userId: number): Promise<{ leveledUp: boolean; level: number; previousLevel: number } | null> {
    const [user, thresholds] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { level: true, totalSpent: true } }),
        prisma.levelThreshold.findMany({ orderBy: { level: 'asc' } }),
    ]);
    if (!user) return null;

    if (user.totalSpent < 0) {
        await prisma.user.update({ where: { id: userId }, data: { totalSpent: 0 } });
        user.totalSpent = 0;
    }

    const newLevel = levelForSpend(thresholds, user.totalSpent);
    if (newLevel <= user.level) return { leveledUp: false, level: user.level, previousLevel: user.level };

    await prisma.user.update({ where: { id: userId }, data: { level: newLevel } });
    await createNotification({
        audience: 'user',
        targetUserId: userId,
        type: 'level_up',
        title: 'Seviye atladın!',
        body: `Tebrikler, seviye ${newLevel} oldun.`,
        data: { level: newLevel },
    }).catch(() => {});

    return { leveledUp: true, level: newLevel, previousLevel: user.level };
}

/** Yanıta eklenecek parça: yalnız seviye atlandıysa `level_up` döner, aksi halde sözleşme değişmez. */
export function levelUpField(result: Awaited<ReturnType<typeof syncLevel>>) {
    return result?.leveledUp ? { level_up: { level: result.level, previous_level: result.previousLevel } } : {};
}
