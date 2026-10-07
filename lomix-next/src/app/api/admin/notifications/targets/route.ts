import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

/** Bildirim formundaki hedef seçiciler: `?type=agencies` ya da `?type=users&q=ara`. */
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) {
        return NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'agencies') {
        const agencies = await prisma.agency.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
        return NextResponse.json({ agencies });
    }

    const q = (searchParams.get('q') || '').trim();
    if (q.length < 2) return NextResponse.json({ users: [] });

    const numeric = Number(q);
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { username: { contains: q, mode: 'insensitive' } },
                { fullName: { contains: q, mode: 'insensitive' } },
                ...(Number.isInteger(numeric) ? [{ id: numeric }] : []),
            ],
        },
        select: { id: true, username: true, fullName: true, isBroadcaster: true },
        take: 20,
    });
    return NextResponse.json({ users });
}
