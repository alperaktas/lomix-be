import prisma from '@/lib/prisma';

/**
 * profile/following, profile/followers ve profile/friends uclarinin ortak yardimcilari.
 * Uc uc de ayni kullanici satiri bicimini donuyor; bicim stories/viewers ile ayni desende.
 */

export type ListUser = {
    id: number;
    username: string;
    fullName: string | null;
    avatar: string | null;
    level: number;
    isVip: boolean;
};

export const USER_SELECT = {
    id: true,
    username: true,
    fullName: true,
    avatar: true,
    level: true,
    isVip: true,
} as const;

export function formatUserRow(
    user: ListUser,
    opts: { isFollowing: boolean; since?: Date | null }
) {
    const displayName = (user.fullName || user.username || "").trim();
    const nameParts = displayName.split(" ");

    return {
        id: String(user.id),
        user_id: String(user.id),
        username: user.username,
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
        name: displayName,
        level: user.level,
        is_vip: user.isVip,
        image_url: user.avatar || null,
        display_id: String(user.id),
        is_following: opts.isFollowing,
        since: opts.since ? opts.since.toISOString() : null,
    };
}

/** Istegi yapan kullanicinin, verilen id'lerden hangilerini takip ettigi. */
export async function followingIdSet(currentUserId: number, targetIds: number[]): Promise<Set<number>> {
    if (targetIds.length === 0) return new Set();
    const rows = await prisma.userFollow.findMany({
        where: { followerId: currentUserId, followingId: { in: targetIds } },
        select: { followingId: true },
    });
    return new Set(rows.map(r => r.followingId));
}

/**
 * Liste uclari hem GET (query) hem POST (body) ile cagrilabiliyor;
 * mobil taraf hangisini kullanirsa kullansin ayni yaniti almali.
 */
export async function readListParams(request: Request): Promise<{ userId?: string; limit: number; offset: number }> {
    let raw: Record<string, any> = {};

    if (request.method === 'POST') {
        raw = await request.json().catch(() => ({}));
    } else {
        const { searchParams } = new URL(request.url);
        raw = Object.fromEntries(searchParams.entries());
    }

    const userId = raw.user_id ?? raw.userId;
    const limit = Math.min(Math.max(Number(raw.limit ?? 100) || 100, 1), 200);
    const offset = Math.max(Number(raw.offset ?? 0) || 0, 0);

    return {
        userId: userId === undefined || userId === null || String(userId).trim() === '' ? undefined : String(userId),
        limit,
        offset,
    };
}

/** user_id gonderilmezse kendi listesi; gonderilirse o kullanicinin listesi. */
export function resolveTargetId(currentUserId: number, userIdParam?: string): number | null {
    if (userIdParam === undefined) return currentUserId;
    const parsed = Number(userIdParam);
    return isNaN(parsed) ? null : parsed;
}
