import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { membershipEarnings, normalizePhone } from '@/lib/agency';

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const PAGE_SIZE = 50;
const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;

const OWNER_SELECT = { id: true, username: true, fullName: true, avatar: true } as const;

/** Ajans ID'si ya da ajans adıyla arama. */
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);

    const idMatch = /^#?\d+$/.test(q) ? Number(q.replace('#', '')) : null;
    const where = q
        ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, ...(idMatch !== null ? [{ id: idMatch }] : [])] }
        : {};

    const [agencies, total] = await Promise.all([
        prisma.agency.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            include: { owner: { select: OWNER_SELECT } },
        }),
        prisma.agency.count({ where }),
    ]);

    const agencyIds = agencies.map(a => a.id);
    const [memberCounts, memberships] = agencyIds.length === 0 ? [[], []] : await Promise.all([
        prisma.agencyMember.groupBy({
            by: ['agencyId'],
            where: { agencyId: { in: agencyIds }, status: 'approved' },
            _count: { _all: true },
        }),
        prisma.agencyMembership.findMany({ where: { agencyId: { in: agencyIds } }, select: { id: true, agencyId: true } }),
    ]);

    const earnings = agencyIds.length === 0 ? [] : await membershipEarnings({ agencyIds });
    const agencyOfMembership = new Map(memberships.map(m => [m.id, m.agencyId]));
    const earningByAgency = new Map<number, number>();
    for (const e of earnings) {
        const agencyId = agencyOfMembership.get(e.membershipId);
        if (agencyId !== undefined) earningByAgency.set(agencyId, (earningByAgency.get(agencyId) ?? 0) + e.diamonds);
    }
    const countByAgency = new Map(memberCounts.map(c => [c.agencyId, c._count._all]));

    return NextResponse.json({
        agencies: agencies.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            whatsappNumber: a.whatsappNumber,
            isActive: a.isActive,
            createdAt: a.createdAt,
            owner: a.owner,
            memberCount: countByAgency.get(a.id) ?? 0,
            totalEarnings: earningByAgency.get(a.id) ?? 0,
        })),
        total,
        totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    });
}

export async function POST(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();

    try {
        const body = await request.json().catch(() => null);
        const ownerId = Number(body?.ownerId);
        const name = typeof body?.name === 'string' ? body.name.trim() : '';
        const description = typeof body?.description === 'string' ? body.description.trim() : '';
        const rawPhone = typeof body?.whatsappNumber === 'string' ? body.whatsappNumber : '';

        if (!Number.isInteger(ownerId) || ownerId < 1) return NextResponse.json({ error: 'Ajans sahibinin kullanıcı ID\'si zorunludur.' }, { status: 400 });
        if (!name) return NextResponse.json({ error: 'Ajans ismi zorunludur.' }, { status: 400 });
        if (name.length > NAME_MAX) return NextResponse.json({ error: `Ajans ismi en fazla ${NAME_MAX} karakter olabilir.` }, { status: 400 });
        if (description.length > DESCRIPTION_MAX) return NextResponse.json({ error: `Açıklama en fazla ${DESCRIPTION_MAX} karakter olabilir.` }, { status: 400 });

        const whatsappNumber = normalizePhone(rawPhone);
        if (!whatsappNumber) return NextResponse.json({ error: 'Geçerli bir WhatsApp numarası giriniz.' }, { status: 400 });

        const owner = await prisma.user.findUnique({
            where: { id: ownerId },
            select: { id: true, ownedAgency: { select: { id: true, name: true } }, agencyMembership: { select: { agencyId: true } } },
        });
        if (!owner) return NextResponse.json({ error: 'Bu ID ile bir kullanıcı bulunamadı.' }, { status: 404 });
        if (owner.ownedAgency) {
            return NextResponse.json({ error: `Bu kullanıcı zaten "${owner.ownedAgency.name}" ajansının sahibi.` }, { status: 409 });
        }
        if (owner.agencyMembership) {
            return NextResponse.json({ error: 'Bu kullanıcı bir ajansa yayıncı olarak bağlı; önce ajanstan çıkarılmalı.' }, { status: 409 });
        }

        try {
            const agency = await prisma.agency.create({
                data: { ownerId, name, description: description || null, whatsappNumber },
            });
            return NextResponse.json({ agency: { id: agency.id } }, { status: 201 });
        } catch (e: any) {
            if (e?.code === 'P2002') return NextResponse.json({ error: 'Bu kullanıcı zaten bir ajansın sahibi.' }, { status: 409 });
            throw e;
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
