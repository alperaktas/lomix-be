import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { createNotification } from '@/lib/notifications';

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const STATUSES = ['pending', 'in_progress', 'completed'];
const PAGE_SIZE = 50;

const STATUS_NOTICE: Record<string, string> = {
    in_progress: 'Talebiniz incelemeye alındı.',
    completed: 'Talebiniz tamamlandı.',
};

export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const where = status && STATUSES.includes(status) ? { status } : {};

    const [items, total, grouped] = await Promise.all([
        prisma.complaint.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            include: { user: { select: { id: true, username: true, fullName: true } } },
        }),
        prisma.complaint.count({ where }),
        prisma.complaint.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return NextResponse.json({
        complaints: items.map(c => ({
            id: c.id,
            category: c.category,
            description: c.description,
            imageUrls: c.imageUrls,
            status: c.status,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            user: c.user,
        })),
        total,
        totalPages: Math.ceil(total / PAGE_SIZE) || 1,
        counts: Object.fromEntries(grouped.map(g => [g.status, g._count._all])),
    });
}

/** Talep durumunu değiştirir; kullanıcıya bildirim gider. Admin tamamlanmış talebi de geri açabilir. */
export async function PUT(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const { id, status } = await request.json();
        if (!id) return NextResponse.json({ error: 'id zorunludur.' }, { status: 400 });
        if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Geçersiz durum.' }, { status: 400 });

        const current = await prisma.complaint.findUnique({ where: { id: Number(id) } });
        if (!current) return NextResponse.json({ error: 'Talep bulunamadı.' }, { status: 404 });
        if (current.status === status) return NextResponse.json({ complaint: current });

        const complaint = await prisma.complaint.update({ where: { id: current.id }, data: { status } });

        if (STATUS_NOTICE[status]) {
            await createNotification({
                audience: 'user',
                targetUserId: current.userId,
                type: 'complaint_status',
                title: 'Talebiniz güncellendi',
                body: `"${current.category}" için: ${STATUS_NOTICE[status]}`,
                data: { complaint_id: String(current.id), status },
            }).catch(() => {});
        }

        return NextResponse.json({ complaint });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
