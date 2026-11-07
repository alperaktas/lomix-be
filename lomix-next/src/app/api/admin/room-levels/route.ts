import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { recalcAllRoomLevels } from '@/lib/room-level';

const MAX_AMOUNT = 2_000_000_000;
const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

/** Seviye 0 herkesin başlangıcıdır: gereken hediye her zaman 0. Diğer seviyeler pozitif tam sayı ister. */
function check(level: number, required: number): string | null {
    if (!Number.isInteger(level) || level < 0 || level > 999) return 'level 0 ile 999 arasında tam sayı olmalı.';
    if (level === 0) return null;
    if (!Number.isInteger(required) || required < 1 || required > MAX_AMOUNT) {
        return `Gereken hediye toplamı 1 ile ${MAX_AMOUNT.toLocaleString('tr-TR')} arasında tam sayı olmalı.`;
    }
    return null;
}

/** Seviye arttıkça gereken hediye toplamı da artmalı. */
async function checkMonotonic(level: number, required: number, ignoreId?: number): Promise<string | null> {
    const others = await prisma.roomLevelThreshold.findMany({ where: ignoreId ? { id: { not: ignoreId } } : {} });
    for (const o of others) {
        if (o.level < level && o.requiredGifts >= required) {
            return `Seviye ${o.level} zaten ${o.requiredGifts.toLocaleString('tr-TR')} coin istiyor; seviye ${level} daha yüksek bir tutar istemeli.`;
        }
        if (o.level > level && o.requiredGifts <= required) {
            return `Seviye ${o.level} ${o.requiredGifts.toLocaleString('tr-TR')} coin istiyor; seviye ${level} bundan düşük olmalı.`;
        }
    }
    return null;
}

// GET: seviyeler + her seviyedeki oda sayısı
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    const [thresholds, counts] = await Promise.all([
        prisma.roomLevelThreshold.findMany({ orderBy: { level: 'asc' } }),
        prisma.room.groupBy({ by: ['level'], _count: { _all: true } }),
    ]);
    const roomCounts: Record<string, number> = {};
    for (const c of counts) roomCounts[c.level === null ? 'null' : String(c.level)] = c._count._all;
    return NextResponse.json({ thresholds, roomCounts });
}

// POST { level, requiredGifts, name? }: kaydedince odalar yeniden hesaplanır (yalnız yükselir)
export async function POST(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const body = await request.json().catch(() => null);
        if (!body) return err('Geçersiz istek gövdesi.', 400);
        const level = Number(body.level);
        const required = level === 0 ? 0 : Number(body.requiredGifts);
        const bad = check(level, required);
        if (bad) return err(bad, 400);
        if (await prisma.roomLevelThreshold.findUnique({ where: { level } })) return err('Bu seviye zaten tanımlı.', 409);
        const problem = await checkMonotonic(level, required);
        if (problem) return err(problem, 400);

        const threshold = await prisma.roomLevelThreshold.create({
            data: { level, requiredGifts: required, name: typeof body.name === 'string' ? body.name.trim() || null : null },
        });
        const recalc = await recalcAllRoomLevels();
        return NextResponse.json({ threshold, recalc });
    } catch (error: any) {
        return err(error.message, 500);
    }
}

// PUT { id, level?, requiredGifts?, name? }
export async function PUT(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const body = await request.json().catch(() => null);
        if (!body?.id) return err('id zorunludur.', 400);
        const current = await prisma.roomLevelThreshold.findUnique({ where: { id: Number(body.id) } });
        if (!current) return err('Seviye bulunamadı.', 404);

        const level = body.level !== undefined ? Number(body.level) : current.level;
        const required = level === 0 ? 0 : (body.requiredGifts !== undefined ? Number(body.requiredGifts) : current.requiredGifts);
        const bad = check(level, required);
        if (bad) return err(bad, 400);
        if (level !== current.level && (await prisma.roomLevelThreshold.findUnique({ where: { level } }))) {
            return err('Bu seviye zaten tanımlı.', 409);
        }
        const problem = await checkMonotonic(level, required, current.id);
        if (problem) return err(problem, 400);

        const threshold = await prisma.roomLevelThreshold.update({
            where: { id: current.id },
            data: {
                level,
                requiredGifts: required,
                ...(body.name !== undefined && { name: typeof body.name === 'string' ? body.name.trim() || null : null }),
            },
        });
        const recalc = await recalcAllRoomLevels();
        return NextResponse.json({ threshold, recalc });
    } catch (error: any) {
        return err(error.message, 500);
    }
}

// DELETE ?id=: odaların mevcut seviyesi düşmez
export async function DELETE(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const id = Number(new URL(request.url).searchParams.get('id'));
        if (!Number.isInteger(id) || id < 1) return err('id zorunludur.', 400);
        const removed = await prisma.roomLevelThreshold.deleteMany({ where: { id } });
        if (removed.count === 0) return err('Seviye bulunamadı.', 404);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return err(error.message, 500);
    }
}
