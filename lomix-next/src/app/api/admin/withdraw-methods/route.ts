import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getAmountOptions, parseAmountOptions, setAmountOptions } from '@/lib/withdrawal';

const MAX_AMOUNT = 2_000_000_000;
const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_AMOUNT;
const fmt = (n: number) => n.toLocaleString('tr-TR');

const view = (m: { id: number; name: string; description: string; minAmount: number; maxAmount: number; isActive: boolean; order: number }) => ({
    id: m.id, name: m.name, description: m.description, minAmount: m.minAmount, maxAmount: m.maxAmount, isActive: m.isActive, order: m.order,
});

/**
 * Elmas çekim yöntemleri. Mobilde `diamond/withdrawal-center` aktif yöntemleri listeler; `diamond/withdraw` yalnızca
 * burada tanımlı, aktif ve adı birebir eşleşen yöntemle çalışır. Hızlı miktar düğmeleri (`amountOptions`) tek ayardır.
 */

// GET: yöntemler + hızlı miktarlar
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    const [methods, amountOptions] = await Promise.all([
        prisma.withdrawMethod.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] }),
        getAmountOptions(),
    ]);
    return NextResponse.json({ methods: methods.map(view), amountOptions });
}

// POST { name, description?, minAmount, maxAmount, isActive? }
export async function POST(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return err('Geçersiz istek gövdesi.', 400);

        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name || name.length > 100) return err('Yöntem adı 1 ile 100 karakter arasında olmalıdır.', 400);
        if (!isAmount(body.minAmount)) return err(`En düşük miktar 1 ile ${fmt(MAX_AMOUNT)} arasında bir tam sayı olmalıdır.`, 400);
        if (!isAmount(body.maxAmount)) return err(`En yüksek miktar 1 ile ${fmt(MAX_AMOUNT)} arasında bir tam sayı olmalıdır.`, 400);
        if (body.minAmount > body.maxAmount) return err('En düşük miktar, en yüksek miktardan büyük olamaz.', 400);
        if (body.isActive !== undefined && typeof body.isActive !== 'boolean') return err('isActive true veya false olmalıdır.', 400);
        const description = typeof body.description === 'string' ? body.description.trim().slice(0, 200) : '';

        if (await prisma.withdrawMethod.findUnique({ where: { name }, select: { id: true } })) {
            return err('Bu adla bir çekim yöntemi zaten var.', 409);
        }
        const last = await prisma.withdrawMethod.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
        const method = await prisma.withdrawMethod.create({
            data: { name, description, minAmount: body.minAmount, maxAmount: body.maxAmount, isActive: body.isActive ?? true, order: (last?.order ?? 0) + 1 },
        });
        return NextResponse.json({ method: view(method) }, { status: 201 });
    } catch (error: any) {
        return err(error.message, 500);
    }
}

// PUT { id, name?, description?, minAmount?, maxAmount?, isActive? }  veya  { amountOptions: number[] }
export async function PUT(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return err('Geçersiz istek gövdesi.', 400);

        // Hızlı miktar düğmeleri
        if (body.id === undefined && body.amountOptions !== undefined) {
            const raw = Array.isArray(body.amountOptions) ? body.amountOptions.join(',') : String(body.amountOptions);
            const parsed = parseAmountOptions(raw);
            const given = raw.split(/[,\s;]+/).filter(Boolean).length;
            if (parsed.length !== given) return err('Hızlı miktarlar pozitif tam sayı olmalı ve tekrar etmemelidir.', 400);
            if (parsed.length > 6) return err('En fazla 6 hızlı miktar tanımlanabilir.', 400);
            await setAmountOptions(parsed);
            return NextResponse.json({ amountOptions: parsed });
        }

        const id = Number(body.id);
        if (!Number.isInteger(id) || id < 1) return err('id zorunludur.', 400);
        const current = await prisma.withdrawMethod.findUnique({ where: { id } });
        if (!current) return err('Çekim yöntemi bulunamadı.', 404);

        const data: { name?: string; description?: string; minAmount?: number; maxAmount?: number; isActive?: boolean } = {};
        if (body.name !== undefined) {
            const name = typeof body.name === 'string' ? body.name.trim() : '';
            if (!name || name.length > 100) return err('Yöntem adı 1 ile 100 karakter arasında olmalıdır.', 400);
            if (name !== current.name && (await prisma.withdrawMethod.findUnique({ where: { name }, select: { id: true } }))) {
                return err('Bu adla bir çekim yöntemi zaten var.', 409);
            }
            data.name = name;
        }
        if (body.description !== undefined) data.description = typeof body.description === 'string' ? body.description.trim().slice(0, 200) : '';
        if (body.minAmount !== undefined) {
            if (!isAmount(body.minAmount)) return err(`En düşük miktar 1 ile ${fmt(MAX_AMOUNT)} arasında bir tam sayı olmalıdır.`, 400);
            data.minAmount = body.minAmount;
        }
        if (body.maxAmount !== undefined) {
            if (!isAmount(body.maxAmount)) return err(`En yüksek miktar 1 ile ${fmt(MAX_AMOUNT)} arasında bir tam sayı olmalıdır.`, 400);
            data.maxAmount = body.maxAmount;
        }
        if ((data.minAmount ?? current.minAmount) > (data.maxAmount ?? current.maxAmount)) {
            return err('En düşük miktar, en yüksek miktardan büyük olamaz.', 400);
        }
        if (body.isActive !== undefined) {
            if (typeof body.isActive !== 'boolean') return err('isActive true veya false olmalıdır.', 400);
            data.isActive = body.isActive;
        }
        if (Object.keys(data).length === 0) return err('Güncellenecek alan yok.', 400);

        const method = await prisma.withdrawMethod.update({ where: { id }, data });
        return NextResponse.json({ method: view(method) });
    } catch (error: any) {
        return err(error.message, 500);
    }
}

// DELETE ?id=  (geçmiş talepler yöntem adını kendi içinde tuttuğu için etkilenmez)
export async function DELETE(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const id = Number(new URL(request.url).searchParams.get('id'));
        if (!Number.isInteger(id) || id < 1) return err('id zorunludur.', 400);
        const removed = await prisma.withdrawMethod.deleteMany({ where: { id } });
        if (removed.count === 0) return err('Çekim yöntemi bulunamadı.', 404);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return err(error.message, 500);
    }
}
