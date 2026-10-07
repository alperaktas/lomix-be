import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export type NotificationAudience = 'all' | 'broadcasters' | 'agency' | 'user';

export async function createNotification(input: {
    audience: NotificationAudience;
    title: string;
    body: string;
    type?: string;
    agencyId?: number | null;
    targetUserId?: number | null;
    data?: Prisma.InputJsonValue;
    createdBy?: number | null;
}) {
    return prisma.notification.create({
        data: {
            audience: input.audience,
            title: input.title,
            body: input.body,
            type: input.type ?? 'system',
            agencyId: input.agencyId ?? null,
            targetUserId: input.targetUserId ?? null,
            data: input.data,
            createdBy: input.createdBy ?? null,
        },
    });
}

/**
 * Bir kullanıcının görebileceği bildirimlerin filtresi. Toplu bildirimler kullanıcı başına
 * satır açılmadan okuma anında hedefe göre eşleştirilir; üyelikten önce gönderilmiş
 * bildirimler gösterilmez.
 */
export async function visibleNotificationsWhere(userId: number): Promise<Prisma.NotificationWhereInput | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            createdAt: true,
            isBroadcaster: true,
            ownedAgency: { select: { id: true } },
            agencyMembership: { select: { agencyId: true, status: true } },
        },
    });
    if (!user) return null;

    const agencyIds: number[] = [];
    if (user.ownedAgency) agencyIds.push(user.ownedAgency.id);
    if (user.agencyMembership?.status === 'approved') agencyIds.push(user.agencyMembership.agencyId);

    return {
        createdAt: { gte: user.createdAt },
        OR: [
            { audience: 'all' },
            ...(user.isBroadcaster ? [{ audience: 'broadcasters' }] : []),
            ...(agencyIds.length > 0 ? [{ audience: 'agency', agencyId: { in: agencyIds } }] : []),
            { audience: 'user', targetUserId: userId },
        ],
    };
}
