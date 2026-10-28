import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

/** Ajans oluştururken kullanıcı ID'si girilince ad-soyadın otomatik gelmesi için. */
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) {
        return NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
    }

    const userId = Number(new URL(request.url).searchParams.get('userId'));
    if (!Number.isInteger(userId) || userId < 1) return NextResponse.json({ error: 'userId zorunludur.' }, { status: 400 });

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true, username: true, fullName: true, avatar: true,
            ownedAgency: { select: { id: true, name: true } },
            agencyMembership: { select: { agency: { select: { id: true, name: true } } } },
        },
    });
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });

    return NextResponse.json({
        user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            avatar: user.avatar,
            ownsAgency: user.ownedAgency,
            memberOf: user.agencyMembership?.agency ?? null,
        },
    });
}
