import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { joinAgency, leaveAgency, transferMember } from '@/lib/agency';

type Ctx = { params: Promise<{ id: string }> };

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

function toId(raw: unknown): number | null {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
}

/** Yayıncıyı ajansa ekler: katılma tarihi kaydedilir, ajansın yayıncı listesine girer. */
export async function POST(request: Request, { params }: Ctx) {
    if (!(await requireAdmin(request))) return forbidden();

    try {
        const agencyId = toId((await params).id);
        if (!agencyId) return err('Ajans bulunamadı.', 404);

        const userId = toId((await request.json().catch(() => null))?.userId);
        if (!userId) return err('Yayıncının kullanıcı ID\'si zorunludur.', 400);

        const [agency, user] = await Promise.all([
            prisma.agency.findUnique({ where: { id: agencyId }, select: { id: true, isActive: true } }),
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    ownedAgency: { select: { name: true } },
                    agencyMembership: { select: { agencyId: true, status: true, agency: { select: { name: true } } } },
                },
            }),
        ]);
        if (!agency) return err('Ajans bulunamadı.', 404);
        if (!agency.isActive) return err('Pasif ajansa yayıncı eklenemez. Önce ajansı aktif edin.', 409);
        if (!user) return err('Bu ID ile bir kullanıcı bulunamadı.', 404);
        if (user.ownedAgency) return err(`Bu kullanıcı "${user.ownedAgency.name}" ajansının sahibi, yayıncı olarak eklenemez.`, 409);

        const m = user.agencyMembership;
        if (m && (m.status === 'approved' || m.agencyId !== agencyId)) {
            return err(
                m.agencyId === agencyId
                    ? 'Bu kullanıcı zaten bu ajansın yayıncısı.'
                    : `Bu kullanıcı zaten "${m.agency.name}" ajansında. Başka ajansa taşımak için transfer kullanın.`,
                409,
            );
        }

        try {
            await prisma.$transaction(tx => joinAgency(tx, agencyId, userId));
        } catch (e: any) {
            if (e?.code === 'P2002') return err('Bu kullanıcı zaten bir ajansa bağlı.', 409);
            throw e;
        }
        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error: any) {
        return err(error.message, 500);
    }
}

/** Yayıncıyı başka ajansa aktarır. Kazançlar bulunduğu döneme göre eski ajansta kalır. */
export async function PUT(request: Request, { params }: Ctx) {
    if (!(await requireAdmin(request))) return forbidden();

    try {
        const fromAgencyId = toId((await params).id);
        if (!fromAgencyId) return err('Ajans bulunamadı.', 404);

        const body = await request.json().catch(() => null);
        const userId = toId(body?.userId);
        const toAgencyId = toId(body?.toAgencyId);
        if (!userId || !toAgencyId) return err('userId ve toAgencyId zorunludur.', 400);
        if (toAgencyId === fromAgencyId) return err('Yayıncı zaten bu ajansta.', 400);

        const [member, target] = await Promise.all([
            prisma.agencyMember.findUnique({ where: { userId }, select: { agencyId: true, status: true } }),
            prisma.agency.findUnique({ where: { id: toAgencyId }, select: { id: true, isActive: true } }),
        ]);
        if (!member || member.agencyId !== fromAgencyId || member.status !== 'approved') {
            return err('Bu kullanıcı bu ajansın yayıncısı değil.', 404);
        }
        if (!target) return err('Hedef ajans bulunamadı.', 404);
        if (!target.isActive) return err('Pasif ajansa yayıncı aktarılamaz.', 409);

        await prisma.$transaction(tx => transferMember(tx, userId, toAgencyId));
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return err(error.message, 500);
    }
}

/** Yayıncıyı ajanstan çıkarır; geçmiş dönem ve kazanç kaydı korunur. */
export async function DELETE(request: Request, { params }: Ctx) {
    if (!(await requireAdmin(request))) return forbidden();

    try {
        const agencyId = toId((await params).id);
        const userId = toId(new URL(request.url).searchParams.get('userId'));
        if (!agencyId) return err('Ajans bulunamadı.', 404);
        if (!userId) return err('userId zorunludur.', 400);

        const member = await prisma.agencyMember.findUnique({ where: { userId }, select: { agencyId: true } });
        if (!member || member.agencyId !== agencyId) return err('Bu kullanıcı bu ajansın yayıncısı değil.', 404);

        await prisma.$transaction(tx => leaveAgency(tx, userId));
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return err(error.message, 500);
    }
}
