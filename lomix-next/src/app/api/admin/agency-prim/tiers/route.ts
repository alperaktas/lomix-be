import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { DEFAULT_TIERS } from '@/lib/agency-prim';

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const err = (error: string, status: number) => NextResponse.json({ error, }, { status });

function parseTier(body: any): { error: string } | { fromDiamonds: number; ratePercent: number } {
    const fromDiamonds = Number(body?.fromDiamonds);
    const ratePercent = Number(body?.ratePercent);
    if (!Number.isInteger(fromDiamonds) || fromDiamonds < 0) return { error: 'Alt sınır 0 veya daha büyük tam sayı olmalı.' };
    if (!Number.isInteger(ratePercent) || ratePercent < 0 || ratePercent > 100) return { error: 'Oran 0 ile 100 arasında tam sayı olmalı.' };
    return { fromDiamonds, ratePercent };
}

/** Kademeler. Hiç kayıt yoksa ürün sahibinin tablosu (%20 → %35) yazılır, böylece düzenleme gerçek satırlar üzerinden yapılır. */
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();

    if ((await prisma.agencyPrimTier.count()) === 0) {
        await prisma.agencyPrimTier.createMany({ data: DEFAULT_TIERS, skipDuplicates: true });
    }
    const tiers = await prisma.agencyPrimTier.findMany({ orderBy: { fromDiamonds: 'asc' } });
    return NextResponse.json({ tiers });
}

export async function POST(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const parsed = parseTier(await request.json().catch(() => null));
        if ('error' in parsed) return err(parsed.error, 400);
        if (await prisma.agencyPrimTier.findUnique({ where: { fromDiamonds: parsed.fromDiamonds } })) {
            return err('Bu alt sınır için zaten bir kademe var.', 409);
        }
        const tier = await prisma.agencyPrimTier.create({ data: parsed });
        return NextResponse.json({ tier }, { status: 201 });
    } catch (error: any) {
        return err(error.message, 500);
    }
}

export async function PUT(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const body = await request.json().catch(() => null);
        const id = Number(body?.id);
        if (!Number.isInteger(id) || id < 1) return err('id zorunludur.', 400);

        const current = await prisma.agencyPrimTier.findUnique({ where: { id } });
        if (!current) return err('Kademe bulunamadı.', 404);

        const parsed = parseTier({ fromDiamonds: body.fromDiamonds ?? current.fromDiamonds, ratePercent: body.ratePercent ?? current.ratePercent });
        if ('error' in parsed) return err(parsed.error, 400);

        if (current.fromDiamonds === 0 && parsed.fromDiamonds !== 0) {
            return err('İlk kademenin alt sınırı 0 olmalıdır; değiştirilemez.', 400);
        }
        if (parsed.fromDiamonds !== current.fromDiamonds && (await prisma.agencyPrimTier.findUnique({ where: { fromDiamonds: parsed.fromDiamonds } }))) {
            return err('Bu alt sınır için zaten bir kademe var.', 409);
        }
        const tier = await prisma.agencyPrimTier.update({ where: { id }, data: parsed });
        return NextResponse.json({ tier });
    } catch (error: any) {
        return err(error.message, 500);
    }
}

export async function DELETE(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const id = Number(new URL(request.url).searchParams.get('id'));
        if (!Number.isInteger(id) || id < 1) return err('id zorunludur.', 400);
        const current = await prisma.agencyPrimTier.findUnique({ where: { id } });
        if (!current) return err('Kademe bulunamadı.', 404);
        if (current.fromDiamonds === 0) return err('0\'dan başlayan ilk kademe silinemez.', 400);
        await prisma.agencyPrimTier.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return err(error.message, 500);
    }
}
