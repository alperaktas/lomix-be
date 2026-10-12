import prisma from '@/lib/prisma';

/** Son istekten bu yana bu kadar süre geçmediyse kullanıcı "online" sayılır. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;
/** Aynı kullanıcı için veritabanına en sık bu aralıkla yazılır. */
const TOUCH_INTERVAL_MS = 60 * 1000;
const MAX_TRACKED = 5000;

// Sunucu örneği başına hafıza: çoğu istek veritabanına hiç dokunmadan geçer.
const lastTouched = new Map<number, number>();

/**
 * Doğrulanmış bir mobil/API isteği geldiğinde kullanıcının son görülme zamanını günceller.
 * Hata verirse sessizce yutulur: kimlik doğrulamayı asla bozmamalı.
 */
export async function touchPresence(userId: number): Promise<void> {
    const now = Date.now();
    const prev = lastTouched.get(userId);
    if (prev !== undefined && now - prev < TOUCH_INTERVAL_MS) return;

    if (lastTouched.size >= MAX_TRACKED) lastTouched.clear();
    lastTouched.set(userId, now);

    try {
        // Başka bir sunucu örneği az önce yazdıysa satır güncellenmez.
        await prisma.user.updateMany({
            where: {
                id: userId,
                OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(now - TOUCH_INTERVAL_MS) } }],
            },
            data: { lastSeenAt: new Date(now) },
        });
    } catch {
        lastTouched.delete(userId);
    }
}

export function isOnline(lastSeenAt: Date | null | undefined, now: number = Date.now()): boolean {
    return !!lastSeenAt && now - lastSeenAt.getTime() <= ONLINE_WINDOW_MS;
}
