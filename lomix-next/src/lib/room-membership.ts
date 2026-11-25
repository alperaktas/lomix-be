import prisma from '@/lib/prisma';

export type MembershipResult = { ok: boolean; status: number; message: string };

const fail = (status: number, message: string): MembershipResult => ({ ok: false, status, message });
const done = (message: string): MembershipResult => ({ ok: true, status: 200, message });

/** Odaya üyelik isteği gönderir (reddedilmiş istek yeniden gönderilebilir). `room/member-request` ve `room/request` ortak kullanır. */
export async function requestRoomMembership(userId: number, roomPublicId: string): Promise<MembershipResult> {
    const room = await prisma.room.findUnique({
        where: { roomId: String(roomPublicId) },
        select: { id: true, ownerId: true, isLive: true, isClosed: true },
    });
    if (!room) return fail(404, 'Oda bulunamadı.');
    if (room.isClosed || !room.isLive) return fail(403, 'Bu oda aktif değil.');
    if (room.ownerId === userId) return fail(400, 'Oda sahibisiniz.');

    const alreadyMember = await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId: room.id, userId } } });
    if (alreadyMember) return fail(409, 'Zaten bu odanın üyesisiniz.');

    const existing = await prisma.roomMemberRequest.findUnique({ where: { roomId_userId: { roomId: room.id, userId } } });
    if (existing) {
        if (existing.status === 'pending') return fail(409, 'Zaten bekleyen bir isteğiniz var.');
        // Reddedilmişse (ya da kabul edilip üyelikten çıkılmışsa) yeniden gönder
        await prisma.roomMemberRequest.update({ where: { id: existing.id }, data: { status: 'pending', createdAt: new Date() } });
        return done('Üyelik isteği yeniden gönderildi.');
    }

    await prisma.roomMemberRequest.create({ data: { roomId: room.id, userId } });
    return done('Üyelik isteği gönderildi.');
}

/** Kullanıcıyı oda üyeliğinden çıkarır; bekleyen isteği de temizler. Oda sahibi ayrılamaz. */
export async function leaveRoomMembership(userId: number, roomPublicId: string): Promise<MembershipResult> {
    const room = await prisma.room.findUnique({ where: { roomId: String(roomPublicId) }, select: { id: true, ownerId: true } });
    if (!room) return fail(404, 'Oda bulunamadı.');
    if (room.ownerId === userId) return fail(400, 'Oda sahibi üyelikten ayrılamaz.');

    const [removed, pending] = await prisma.$transaction([
        prisma.roomMember.deleteMany({ where: { roomId: room.id, userId } }),
        prisma.roomMemberRequest.deleteMany({ where: { roomId: room.id, userId, status: 'pending' } }),
    ]);
    if (removed.count === 0 && pending.count === 0) return fail(409, 'Bu odanın üyesi değilsiniz.');
    return done(removed.count > 0 ? 'Oda üyeliğinden ayrıldınız.' : 'Üyelik isteğiniz geri çekildi.');
}
