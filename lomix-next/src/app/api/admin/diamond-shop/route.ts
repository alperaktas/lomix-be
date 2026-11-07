import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const TYPES = ['exchange', 'withdraw'] as const;
type ShopType = (typeof TYPES)[number];
/** Int32 sınırının altında kalmak için tek paketin üst sınırı. */
const MAX_AMOUNT = 2_000_000_000;

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_AMOUNT;
const typeOf = (raw: unknown): ShopType | null => (TYPES as readonly string[]).includes(raw as string) ? (raw as ShopType) : null;

const view = (i: { id: number; type: string; coins: number; diamonds: number; order: number; isActive: boolean; createdAt: Date }) => ({
    id: i.id, type: i.type, coins: i.coins, diamonds: i.diamonds, order: i.order, isActive: i.isActive, createdAt: i.createdAt,
});

/**
 * Elmas mağazası paketleri. `exchange`: kullanıcı `diamonds` kadar elmas verir, `coins` kadar coin alır (elmas → coin).
 * `withdraw`: elmas çekim paketleri. Mobilde `diamond/shop` aktif paketleri listeler; `diamond/exchange` ve
 * `diamond/withdraw` yalnızca burada tanımlı, aktif ve elmas miktarı birebir eşleşen pakette çalışır.
 * Aynı türde aynı elmas miktarı iki pakette olamaz (eşleşme belirsiz kalırdı). Sıra elmas miktarına göre otomatik.
 */

// GET /api/admin/diamond-shop?type=exchange|withdraw
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    const type = typeOf(new URL(request.url).searchParams.get('type') ?? 'exchange');
    if (!type) return err("type 'exchange' veya 'withdraw' olmalıdır.", 400);

    const items = await prisma.diamondShopItem.findMany({ where: { type }, orderBy: [{ order: 'asc' }, { id: 'asc' }] });
    return NextResponse.json({ items: items.map(view) });
}

// POST { type, coins, diamonds, isActive? }
export async function POST(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return err('Geçersiz istek gövdesi.', 400);

        const type = typeOf(body.type);
        if (!type) return err("type 'exchange' veya 'withdraw' olmalıdır.", 400);
        if (!isAmount(body.coins)) return err(`Coin miktarı 1 ile ${MAX_AMOUNT.toLocaleString('tr-TR')} arasında bir tam sayı olmalıdır.`, 400);
        if (!isAmount(body.diamonds)) return err(`Elmas miktarı 1 ile ${MAX_AMOUNT.toLocaleString('tr-TR')} arasında bir tam sayı olmalıdır.`, 400);
        if (body.isActive !== undefined && typeof body.isActive !== 'boolean') return err('isActive true veya false olmalıdır.', 400);

        if (await prisma.diamondShopItem.findFirst({ where: { type, diamonds: body.diamonds }, select: { id: true } })) {
            return err(`${body.diamonds.toLocaleString('tr-TR')} elmas için zaten bir paket tanımlı.`, 409);
        }

        const item = await prisma.diamondShopItem.create({
            data: { type, coins: body.coins, diamonds: body.diamonds, order: body.diamonds, isActive: body.isActive ?? true },
        });
        return NextResponse.json({ item: view(item) }, { status: 201 });
    } catch (error: any) {
        return err(error.message, 500);
    }
}

// PUT { id, coins?, diamonds?, isActive? }
export async function PUT(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return err('Geçersiz istek gövdesi.', 400);
        const id = Number(body.id);
        if (!Number.isInteger(id) || id < 1) return err('id zorunludur.', 400);

        const current = await prisma.diamondShopItem.findUnique({ where: { id } });
        if (!current) return err('Paket bulunamadı.', 404);

        const data: { coins?: number; diamonds?: number; order?: number; isActive?: boolean } = {};
        if (body.coins !== undefined) {
            if (!isAmount(body.coins)) return err(`Coin miktarı 1 ile ${MAX_AMOUNT.toLocaleString('tr-TR')} arasında bir tam sayı olmalıdır.`, 400);
            data.coins = body.coins;
        }
        if (body.diamonds !== undefined) {
            if (!isAmount(body.diamonds)) return err(`Elmas miktarı 1 ile ${MAX_AMOUNT.toLocaleString('tr-TR')} arasında bir tam sayı olmalıdır.`, 400);
            if (body.diamonds !== current.diamonds) {
                if (await prisma.diamondShopItem.findFirst({ where: { type: current.type, diamonds: body.diamonds, id: { not: id } }, select: { id: true } })) {
                    return err(`${body.diamonds.toLocaleString('tr-TR')} elmas için zaten bir paket tanımlı.`, 409);
                }
                data.diamonds = body.diamonds;
                data.order = body.diamonds;
            }
        }
        if (body.isActive !== undefined) {
            if (typeof body.isActive !== 'boolean') return err('isActive true veya false olmalıdır.', 400);
            data.isActive = body.isActive;
        }
        if (Object.keys(data).length === 0) return err('Güncellenecek alan yok.', 400);

        const item = await prisma.diamondShopItem.update({ where: { id }, data });
        return NextResponse.json({ item: view(item) });
    } catch (error: any) {
        return err(error.message, 500);
    }
}

// DELETE ?id=
export async function DELETE(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const id = Number(new URL(request.url).searchParams.get('id'));
        if (!Number.isInteger(id) || id < 1) return err('id zorunludur.', 400);
        const removed = await prisma.diamondShopItem.deleteMany({ where: { id } });
        if (removed.count === 0) return err('Paket bulunamadı.', 404);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return err(error.message, 500);
    }
}
