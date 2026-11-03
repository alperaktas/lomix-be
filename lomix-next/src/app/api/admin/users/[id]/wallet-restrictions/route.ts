import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

type Ctx = { params: Promise<{ id: string }> };

const SELECT = { id: true, withdrawBlocked: true, exchangeBlocked: true, spendBlocked: true } as const;

const LABELS = {
    withdrawBlocked: 'Elmas çekim',
    exchangeBlocked: 'Elmas bozdurma',
    spendBlocked: 'Coin harcama',
} as const;
type Field = keyof typeof LABELS;
const FIELDS = Object.keys(LABELS) as Field[];

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });

function parseId(raw: string): number | null {
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
}

const view = (u: { withdrawBlocked: boolean; exchangeBlocked: boolean; spendBlocked: boolean }) => ({
    withdrawBlocked: u.withdrawBlocked,
    exchangeBlocked: u.exchangeBlocked,
    spendBlocked: u.spendBlocked,
});

/** Kullanıcının cüzdan kısıtlamaları: elmas çekim, elmas bozdurma ve coin harcama (true = kapalı). */
export async function GET(request: Request, { params }: Ctx) {
    if (!(await requireAdmin(request))) return forbidden();
    const id = parseId((await params).id);
    if (!id) return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });

    const user = await prisma.user.findUnique({ where: { id }, select: SELECT });
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    return NextResponse.json(view(user));
}

/** Gönderilen alanları günceller: `{ withdrawBlocked?, exchangeBlocked?, spendBlocked? }` (true = kapat). */
export async function PUT(request: Request, { params }: Ctx) {
    const admin = await requireAdmin(request);
    if (!admin) return forbidden();

    try {
        const id = parseId((await params).id);
        if (!id) return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });

        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });

        const data: Partial<Record<Field, boolean>> = {};
        for (const f of FIELDS) {
            if (body[f] === undefined) continue;
            if (typeof body[f] !== 'boolean') return NextResponse.json({ error: `${f} true ya da false olmalıdır.` }, { status: 400 });
            data[f] = body[f];
        }
        if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Güncellenecek alan yok.' }, { status: 400 });

        const current = await prisma.user.findUnique({ where: { id }, select: SELECT });
        if (!current) return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });

        const changed = FIELDS.filter(f => data[f] !== undefined && data[f] !== current[f]);
        if (changed.length === 0) return NextResponse.json(view(current));

        const [updated] = await prisma.$transaction([
            prisma.user.update({ where: { id }, data, select: SELECT }),
            ...changed.map(f => prisma.userLog.create({
                data: { userId: id, action: `${LABELS[f]} işlemi ${data[f] ? 'kapatıldı' : 'açıldı'} (admin #${admin.adminId})` },
            })),
        ]);
        return NextResponse.json(view(updated));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
