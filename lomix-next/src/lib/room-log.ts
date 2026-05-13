import prisma from './prisma';

export function logRoomEvent(
    roomId: number,
    actorId: number,
    action: string,
    targetId?: number | null,
    details?: string | null,
) {
    prisma.roomAdminLog.create({
        data: { roomId, adminId: actorId, action, targetId: targetId ?? null, details: details ?? null },
    }).catch(() => {});
}
