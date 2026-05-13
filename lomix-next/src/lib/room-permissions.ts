import prisma from '@/lib/prisma';

export type RoomRole = 'owner' | 'admin' | 'member' | 'visitor';

export async function getRoomRole(roomDbId: number, userId: number, ownerId: number): Promise<RoomRole> {
    if (userId === ownerId) return 'owner';
    const [user, member] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
        prisma.roomMember.findUnique({ where: { roomId_userId: { roomId: roomDbId, userId } }, select: { role: true } }),
    ]);
    if (user?.role === 'admin') return 'owner';
    if (!member) return 'visitor';
    return member.role as 'admin' | 'member';
}

export function canManageMic(role: RoomRole): boolean {
    return role === 'owner' || role === 'admin';
}

export function canKick(role: RoomRole): boolean {
    return role === 'owner' || role === 'admin';
}

export function canInvite(role: RoomRole): boolean {
    return role === 'owner' || role === 'admin';
}

export function canUpdateTopic(role: RoomRole): boolean {
    return role === 'owner' || role === 'admin';
}

export function canUpdateRoomSettings(role: RoomRole): boolean {
    return role === 'owner';
}

export function canPromoteAdmin(role: RoomRole): boolean {
    return role === 'owner';
}

export function canRemoveMember(role: RoomRole, targetRole: RoomRole): boolean {
    if (role === 'owner') return targetRole !== 'owner';
    if (role === 'admin') return targetRole === 'member' || targetRole === 'visitor';
    return false;
}

export function canUseMic(role: RoomRole, memberOnlyMic: boolean): boolean {
    if (!memberOnlyMic) return true;
    return role !== 'visitor';
}
