import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const AUDIENCES = ['all', 'broadcasters', 'agency', 'user'];

/** Gönderim geçmişi. Seviye atlama gibi otomatik kullanıcı bildirimleri listeyi boğmasın diye hariç tutulur. */
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();

    const notifications = await prisma.notification.findMany({
        where: { type: { not: 'level_up' } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
            agency: { select: { id: true, name: true } },
            targetUser: { select: { id: true, username: true, fullName: true } },
            _count: { select: { reads: true } },
        },
    });

    return NextResponse.json({
        notifications: notifications.map(n => ({
            id: n.id,
            title: n.title,
            body: n.body,
            type: n.type,
            audience: n.audience,
            agency: n.agency,
            targetUser: n.targetUser,
            readCount: n._count.reads,
            createdAt: n.createdAt,
        })),
    });
}

export async function POST(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) return forbidden();

    try {
        const { title, body, audience, agencyId, userIds } = await request.json();

        if (!title?.trim() || !body?.trim()) return NextResponse.json({ error: 'Başlık ve içerik zorunludur.' }, { status: 400 });
        if (title.trim().length > 100) return NextResponse.json({ error: 'Başlık 100 karakteri aşamaz.' }, { status: 400 });
        if (body.trim().length > 1000) return NextResponse.json({ error: 'İçerik 1000 karakteri aşamaz.' }, { status: 400 });
        if (!AUDIENCES.includes(audience)) return NextResponse.json({ error: 'Geçersiz hedef kitle.' }, { status: 400 });

        const base = { title: title.trim(), body: body.trim(), type: 'system', createdBy: admin.adminId };

        if (audience === 'all' || audience === 'broadcasters') {
            const n = await prisma.notification.create({ data: { ...base, audience } });
            return NextResponse.json({ success: true, created: 1, id: n.id });
        }

        if (audience === 'agency') {
            const id = Number(agencyId);
            if (!id) return NextResponse.json({ error: 'agencyId zorunludur.' }, { status: 400 });
            if (!(await prisma.agency.findUnique({ where: { id }, select: { id: true } }))) {
                return NextResponse.json({ error: 'Ajans bulunamadı.' }, { status: 404 });
            }
            const n = await prisma.notification.create({ data: { ...base, audience, agencyId: id } });
            return NextResponse.json({ success: true, created: 1, id: n.id });
        }

        // audience === 'user': her alıcı için ayrı satır (okundu durumu kişiye özel olmalı)
        const ids: number[] = Array.isArray(userIds) ? [...new Set(userIds.map(Number).filter(Boolean))] : [];
        if (ids.length === 0) return NextResponse.json({ error: 'En az bir kullanıcı seçilmeli.' }, { status: 400 });
        if (ids.length > 200) return NextResponse.json({ error: 'Tek seferde en fazla 200 kullanıcı seçilebilir.' }, { status: 400 });

        const existing = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
        if (existing.length === 0) return NextResponse.json({ error: 'Seçilen kullanıcılar bulunamadı.' }, { status: 404 });

        await prisma.notification.createMany({
            data: existing.map(u => ({ ...base, audience: 'user', targetUserId: u.id })),
        });
        return NextResponse.json({ success: true, created: existing.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const id = Number(new URL(request.url).searchParams.get('id'));
        if (!id) return NextResponse.json({ error: 'id zorunludur.' }, { status: 400 });
        await prisma.notification.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
