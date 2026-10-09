import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { createNotification } from '@/lib/notifications';

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const STATUSES = ['pending', 'approved', 'rejected'];
const PAGE_SIZE = 50;

export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const where = status && STATUSES.includes(status) ? { status } : {};

    const [items, total, grouped] = await Promise.all([
        prisma.agencyApplication.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            include: {
                user: { select: { id: true, username: true, fullName: true } },
                agency: { select: { id: true, name: true } },
            },
        }),
        prisma.agencyApplication.count({ where }),
        prisma.agencyApplication.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return NextResponse.json({
        applications: items.map(a => ({
            id: a.id,
            applicationType: a.applicationType,
            contactMethod: a.contactMethod,
            contactValue: a.contactValue,
            note: a.note,
            kvkkAcceptedAt: a.kvkkAcceptedAt,
            status: a.status,
            createdAt: a.createdAt,
            user: a.user,
            agency: a.agency,
        })),
        total,
        totalPages: Math.ceil(total / PAGE_SIZE) || 1,
        counts: Object.fromEntries(grouped.map(g => [g.status, g._count._all])),
    });
}

/**
 * Bekleyen başvuruyu onaylar ya da reddeder. Onay, başvuranı ajansa onaylı üye olarak ekler
 * (bir kullanıcı tek ajansta olabilir; zaten üyeyse 409). Sonuç kullanıcıya bildirilir.
 */
export async function PUT(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const { id, action } = await request.json();
        if (!id) return NextResponse.json({ error: 'id zorunludur.' }, { status: 400 });
        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json({ error: "action 'approve' veya 'reject' olmalıdır." }, { status: 400 });
        }

        const application = await prisma.agencyApplication.findUnique({
            where: { id: Number(id) },
            include: { agency: { select: { name: true } } },
        });
        if (!application) return NextResponse.json({ error: 'Başvuru bulunamadı.' }, { status: 404 });
        if (application.status !== 'pending') {
            return NextResponse.json({ error: 'Yalnızca bekleyen başvurular işlenebilir.' }, { status: 409 });
        }

        if (action === 'approve') {
            const membership = await prisma.agencyMember.findUnique({ where: { userId: application.userId } });
            if (membership) {
                return NextResponse.json({ error: 'Kullanıcı zaten bir ajansa bağlı, başvuru onaylanamaz.' }, { status: 409 });
            }
            // Eşzamanlı çift işlemde ikinci istek 0 satır günceller ve üyelik oluşmaz.
            const result = await prisma.$transaction(async tx => {
                const flipped = await tx.agencyApplication.updateMany({
                    where: { id: application.id, status: 'pending' },
                    data: { status: 'approved' },
                });
                if (flipped.count === 0) return false;
                await tx.agencyMember.create({
                    data: { agencyId: application.agencyId, userId: application.userId, status: 'approved' },
                });
                return true;
            });
            if (!result) return NextResponse.json({ error: 'Başvuru zaten işlenmiş.' }, { status: 409 });
        } else {
            const flipped = await prisma.agencyApplication.updateMany({
                where: { id: application.id, status: 'pending' },
                data: { status: 'rejected' },
            });
            if (flipped.count === 0) return NextResponse.json({ error: 'Başvuru zaten işlenmiş.' }, { status: 409 });
        }

        await createNotification({
            audience: 'user',
            targetUserId: application.userId,
            type: 'agency_application',
            title: action === 'approve' ? 'Ajans başvurunuz onaylandı' : 'Ajans başvurunuz reddedildi',
            body: action === 'approve'
                ? `${application.agency.name} ajansına katıldınız.`
                : `${application.agency.name} ajansına yaptığınız başvuru kabul edilmedi.`,
            data: { application_id: String(application.id), status: action === 'approve' ? 'approved' : 'rejected' },
        }).catch(() => {});

        return NextResponse.json({ success: true, status: action === 'approve' ? 'approved' : 'rejected' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
