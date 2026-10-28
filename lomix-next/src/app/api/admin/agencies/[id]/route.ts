import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { membershipEarnings, normalizePhone } from '@/lib/agency';
import { createNotification } from '@/lib/notifications';
import { PRIM_PERIODS, agencyTurnover, chunkEnd, loadTiers, nextTrMidnight, primFor, settleAgency, type PrimPeriod } from '@/lib/agency-prim';

type Ctx = { params: Promise<{ id: string }> };

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const USER_SELECT = { id: true, username: true, fullName: true, avatar: true } as const;
const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;

function parseId(raw: string): number | null {
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Ajans bilgileri ve yayıncılar. `members` şu an ajanstakiler, `pastMembers` ayrılmış/aktarılmış olanlar;
 * her satırın kazancı yalnızca o ajansta bulunduğu dönem içindir, bu yüzden pasif ajansta ya da
 * transferden sonra da geçmiş korunur.
 */
export async function GET(request: Request, { params }: Ctx) {
    if (!(await requireAdmin(request))) return forbidden();

    const id = parseId((await params).id);
    if (!id) return NextResponse.json({ error: 'Ajans bulunamadı.' }, { status: 404 });

    const agency = await prisma.agency.findUnique({
        where: { id },
        include: { owner: { select: USER_SELECT } },
    });
    if (!agency) return NextResponse.json({ error: 'Ajans bulunamadı.' }, { status: 404 });

    const [memberships, pending, earnings] = await Promise.all([
        prisma.agencyMembership.findMany({
            where: { agencyId: id },
            orderBy: { joinedAt: 'desc' },
            include: { user: { select: USER_SELECT } },
        }),
        prisma.agencyMember.findMany({
            where: { agencyId: id, status: 'pending' },
            include: { user: { select: USER_SELECT } },
        }),
        membershipEarnings({ agencyIds: [id] }),
    ]);

    const earningOf = new Map(earnings.map(e => [e.membershipId, e.diamonds]));
    const rows = memberships.map(m => ({
        membershipId: m.id,
        user: m.user,
        joinedAt: m.joinedAt,
        leftAt: m.leftAt,
        earnings: earningOf.get(m.id) ?? 0,
    }));

    // Prim: seçili dönem, sıradaki (henüz kapanmamış) dönemin anlık cirosu/kademesi ve son ödemeler.
    const tiers = await loadTiers();
    const payouts = await prisma.agencyPrimPayout.findMany({ where: { agencyId: id }, orderBy: { periodStart: 'desc' }, take: 50 });
    let current: { start: Date; end: Date; turnover: number; ratePercent: number; estimatedPrim: number } | null = null;
    if (agency.primPeriod && agency.primPaidThrough && PRIM_PERIODS.includes(agency.primPeriod as PrimPeriod)) {
        const start = agency.primPaidThrough;
        const end = chunkEnd(agency.primPeriod as PrimPeriod, start);
        const turnover = await agencyTurnover(id, start, end);
        current = { start, end, turnover, ...(() => { const p = primFor(turnover, tiers); return { ratePercent: p.ratePercent, estimatedPrim: p.amount }; })() };
    }

    return NextResponse.json({
        agency: {
            id: agency.id,
            name: agency.name,
            description: agency.description,
            whatsappNumber: agency.whatsappNumber,
            isActive: agency.isActive,
            createdAt: agency.createdAt,
            owner: agency.owner,
        },
        prim: {
            period: agency.primPeriod,
            paidThrough: agency.primPaidThrough,
            current,
            payouts: payouts.map(p => ({
                id: p.id, period: p.period, periodStart: p.periodStart, periodEnd: p.periodEnd,
                turnover: p.turnover, ratePercent: p.ratePercent, amount: p.amount, createdAt: p.createdAt,
            })),
        },
        totalEarnings: rows.reduce((sum, r) => sum + r.earnings, 0),
        members: rows.filter(r => r.leftAt === null),
        pastMembers: rows.filter(r => r.leftAt !== null),
        pending: pending.map(p => ({ user: p.user, requestedAt: p.createdAt })),
    });
}

/** Ad, açıklama, WhatsApp, aktif/pasif ve sahip değişikliği. Gönderilmeyen alana dokunulmaz. */
export async function PUT(request: Request, { params }: Ctx) {
    if (!(await requireAdmin(request))) return forbidden();

    try {
        const id = parseId((await params).id);
        if (!id) return NextResponse.json({ error: 'Ajans bulunamadı.' }, { status: 404 });

        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });

        const current = await prisma.agency.findUnique({ where: { id }, select: { id: true, ownerId: true } });
        if (!current) return NextResponse.json({ error: 'Ajans bulunamadı.' }, { status: 404 });

        const data: Record<string, any> = {};

        if (body.name !== undefined) {
            const name = typeof body.name === 'string' ? body.name.trim() : '';
            if (!name) return NextResponse.json({ error: 'Ajans ismi boş olamaz.' }, { status: 400 });
            if (name.length > NAME_MAX) return NextResponse.json({ error: `Ajans ismi en fazla ${NAME_MAX} karakter olabilir.` }, { status: 400 });
            data.name = name;
        }
        if (body.description !== undefined) {
            const description = typeof body.description === 'string' ? body.description.trim() : '';
            if (description.length > DESCRIPTION_MAX) return NextResponse.json({ error: `Açıklama en fazla ${DESCRIPTION_MAX} karakter olabilir.` }, { status: 400 });
            data.description = description || null;
        }
        if (body.whatsappNumber !== undefined) {
            const phone = normalizePhone(typeof body.whatsappNumber === 'string' ? body.whatsappNumber : '');
            if (!phone) return NextResponse.json({ error: 'Geçerli bir WhatsApp numarası giriniz.' }, { status: 400 });
            data.whatsappNumber = phone;
        }
        if (body.isActive !== undefined) {
            if (typeof body.isActive !== 'boolean') return NextResponse.json({ error: 'isActive true/false olmalıdır.' }, { status: 400 });
            data.isActive = body.isActive;
        }
        if (body.primPeriod !== undefined) {
            const period = body.primPeriod;
            if (period !== null && !PRIM_PERIODS.includes(period)) {
                return NextResponse.json({ error: "primPeriod 'daily', 'weekly', 'monthly' ya da null olmalıdır." }, { status: 400 });
            }
            const now = new Date();
            if (period === null) {
                // Kapatmadan önce kapanmış dönemlerin primi ödenir; sonra imleç silinir (açılınca geriye dönük ödeme olmaz).
                await settleAgency(id, now);
                data.primPeriod = null;
                data.primPaidThrough = null;
            } else {
                const existing = await prisma.agency.findUnique({ where: { id }, select: { primPeriod: true } });
                data.primPeriod = period;
                // İlk açılışta sayım ertesi Türkiye gününün başından başlar; tür değişirse imleç korunur (kayıpsız).
                if (!existing?.primPeriod) data.primPaidThrough = nextTrMidnight(now);
            }
        }
        if (body.ownerId !== undefined) {
            const ownerId = Number(body.ownerId);
            if (!Number.isInteger(ownerId) || ownerId < 1) return NextResponse.json({ error: 'Geçersiz sahip ID\'si.' }, { status: 400 });
            if (ownerId !== current.ownerId) {
                const owner = await prisma.user.findUnique({
                    where: { id: ownerId },
                    select: { id: true, ownedAgency: { select: { name: true } }, agencyMembership: { select: { agencyId: true } } },
                });
                if (!owner) return NextResponse.json({ error: 'Bu ID ile bir kullanıcı bulunamadı.' }, { status: 404 });
                if (owner.ownedAgency) return NextResponse.json({ error: `Bu kullanıcı zaten "${owner.ownedAgency.name}" ajansının sahibi.` }, { status: 409 });
                if (owner.agencyMembership) return NextResponse.json({ error: 'Bu kullanıcı bir ajansa yayıncı olarak bağlı; önce ajanstan çıkarılmalı.' }, { status: 409 });
                data.ownerId = ownerId;
            }
        }

        if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Güncellenecek alan yok.' }, { status: 400 });

        try {
            await prisma.agency.update({ where: { id }, data });
        } catch (e: any) {
            if (e?.code === 'P2002') return NextResponse.json({ error: 'Bu kullanıcı zaten bir ajansın sahibi.' }, { status: 409 });
            throw e;
        }
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Ajansı kalıcı siler. Ajansta yayıncı varken silinmez (önce taşınmalı ya da çıkarılmalı); aksi halde
 * yayıncılar ajanssız kalırdı. Silmeden önce kapanmış prim dönemleri sahibe ödenir, böylece kazanılmış prim
 * kaybolmaz (ödenmiş primler cüzdanlarda kalır). Üyelik geçmişi, prim ödeme kayıtları, davetler ve bekleyen
 * başvurular ajansla birlikte silinir; başvuru sahiplerine haber verilir. Geçmişi korumak için silmek yerine
 * pasife almak yeterlidir.
 */
export async function DELETE(request: Request, { params }: Ctx) {
    if (!(await requireAdmin(request))) return forbidden();

    try {
        const id = parseId((await params).id);
        if (!id) return NextResponse.json({ error: 'Ajans bulunamadı.' }, { status: 404 });

        const agency = await prisma.agency.findUnique({ where: { id }, select: { id: true, name: true, primPeriod: true } });
        if (!agency) return NextResponse.json({ error: 'Ajans bulunamadı.' }, { status: 404 });

        const blocked = (count: number) => NextResponse.json(
            { error: `Ajansta ${count} yayıncı var. Önce yayıncıları başka bir ajansa taşıyın ya da ajanstan çıkarın.` },
            { status: 409 }
        );

        const activeMembers = await prisma.agencyMember.count({ where: { agencyId: id, status: 'approved' } });
        if (activeMembers > 0) return blocked(activeMembers);

        if (agency.primPeriod) await settleAgency(id);

        const waiting = await prisma.agencyApplication.findMany({
            where: { agencyId: id, status: { in: ['pending', 'owner_approved'] } },
            select: { userId: true },
        });

        // Kontrol ve silme aynı işlemde: aradan bir yayıncı eklenirse silinmez.
        const deleted = await prisma.$transaction(async tx => {
            const stillActive = await tx.agencyMember.count({ where: { agencyId: id, status: 'approved' } });
            if (stillActive > 0) return stillActive;
            await tx.agency.delete({ where: { id } });
            return 0;
        });
        if (deleted > 0) return blocked(deleted);

        // Ajans bildirimleri ajansla birlikte silindiği için bu bildirim ajansa bağlanmaz.
        await Promise.all(waiting.map(w => createNotification({
            audience: 'user',
            targetUserId: w.userId,
            type: 'agency_application',
            title: 'Ajans başvurunuz sonuçlanmadı',
            body: `${agency.name} ajansı kapatıldı. Başka bir ajansa yeniden başvurabilirsiniz.`,
            data: { status: 'agency_closed' },
        }).catch(() => {})));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
