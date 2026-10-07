import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });

/** Seviye arttıkça gereken harcama da artmalı; aksi halde hesaplama anlamsız olur. */
async function checkMonotonic(level: number, requiredSpend: number, ignoreId?: number): Promise<string | null> {
    const others = await prisma.levelThreshold.findMany({ where: ignoreId ? { id: { not: ignoreId } } : {} });
    for (const o of others) {
        if (o.level < level && o.requiredSpend >= requiredSpend) {
            return `Level ${o.level} zaten ${o.requiredSpend} coin istiyor; level ${level} daha yüksek bir tutar istemeli.`;
        }
        if (o.level > level && o.requiredSpend <= requiredSpend) {
            return `Level ${o.level} ${o.requiredSpend} coin istiyor; level ${level} bundan düşük olmalı.`;
        }
    }
    return null;
}

export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    const thresholds = await prisma.levelThreshold.findMany({ orderBy: { level: 'asc' } });
    return NextResponse.json({ thresholds });
}

export async function POST(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const { level, requiredSpend, name } = await request.json();
        const lvl = Number(level);
        const spend = Number(requiredSpend);
        if (!Number.isInteger(lvl) || lvl < 1) return NextResponse.json({ error: "level 1 veya daha büyük tam sayı olmalı (0 herkesin başlangıcı)." }, { status: 400 });
        if (!Number.isInteger(spend) || spend < 1) return NextResponse.json({ error: 'requiredSpend pozitif tam sayı olmalı.' }, { status: 400 });

        if (await prisma.levelThreshold.findUnique({ where: { level: lvl } })) {
            return NextResponse.json({ error: 'Bu level için zaten eşik var.' }, { status: 409 });
        }
        const problem = await checkMonotonic(lvl, spend);
        if (problem) return NextResponse.json({ error: problem }, { status: 400 });

        const threshold = await prisma.levelThreshold.create({
            data: { level: lvl, requiredSpend: spend, name: name?.trim() || null },
        });
        return NextResponse.json({ threshold });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const { id, level, requiredSpend, name } = await request.json();
        if (!id) return NextResponse.json({ error: 'id zorunludur.' }, { status: 400 });

        const current = await prisma.levelThreshold.findUnique({ where: { id: Number(id) } });
        if (!current) return NextResponse.json({ error: 'Eşik bulunamadı.' }, { status: 404 });

        const lvl = level !== undefined ? Number(level) : current.level;
        const spend = requiredSpend !== undefined ? Number(requiredSpend) : current.requiredSpend;
        if (!Number.isInteger(lvl) || lvl < 1) return NextResponse.json({ error: 'level 1 veya daha büyük tam sayı olmalı.' }, { status: 400 });
        if (!Number.isInteger(spend) || spend < 1) return NextResponse.json({ error: 'requiredSpend pozitif tam sayı olmalı.' }, { status: 400 });

        if (lvl !== current.level && (await prisma.levelThreshold.findUnique({ where: { level: lvl } }))) {
            return NextResponse.json({ error: 'Bu level için zaten eşik var.' }, { status: 409 });
        }
        const problem = await checkMonotonic(lvl, spend, current.id);
        if (problem) return NextResponse.json({ error: problem }, { status: 400 });

        const threshold = await prisma.levelThreshold.update({
            where: { id: current.id },
            data: { level: lvl, requiredSpend: spend, ...(name !== undefined && { name: name?.trim() || null }) },
        });
        return NextResponse.json({ threshold });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const id = Number(new URL(request.url).searchParams.get('id'));
        if (!id) return NextResponse.json({ error: 'id zorunludur.' }, { status: 400 });
        await prisma.levelThreshold.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
