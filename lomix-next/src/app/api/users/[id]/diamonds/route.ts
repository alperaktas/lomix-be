import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const ACTIONS = ['add', 'remove', 'set', 'reset'] as const;
type Action = (typeof ACTIONS)[number];
const LABELS: Record<Action, string> = { add: 'eklendi', remove: 'çıkarıldı', set: 'güncellendi', reset: 'sıfırlandı' };
/** Int32 sınırının altında kalmak için tek bakiyenin üst sınırı. */
const MAX_DIAMONDS = 2_000_000_000;

/**
 * POST: Admin elmas bakiyesini değiştirir.
 * - add: miktar kadar ekler, remove: miktar kadar çıkarır (bakiyenin altına inmez),
 * - set: bakiyeyi miktara eşitler (düzenle), reset: bakiyeyi 0'a çeker (sil).
 * Gerçekleşen fark elmas işlem geçmişine (admin_add / admin_remove) ve kullanıcı loguna yazılır.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ message: 'Admin yetkisi gerekli.' }, { status: 403 });

    try {
        const userId = Number((await params).id);
        if (!Number.isInteger(userId) || userId < 1) return NextResponse.json({ message: 'Kullanıcı bulunamadı.' }, { status: 404 });

        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object') return NextResponse.json({ message: 'Geçersiz istek gövdesi.' }, { status: 400 });
        const { action, amount, reason } = body as { action?: string; amount?: unknown; reason?: unknown };

        if (!ACTIONS.includes(action as Action)) {
            return NextResponse.json({ message: 'Geçersiz işlem (add/remove/set/reset)' }, { status: 400 });
        }
        if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > 200)) {
            return NextResponse.json({ message: 'Açıklama en fazla 200 karakter olabilir.' }, { status: 400 });
        }
        const note = typeof reason === 'string' && reason.trim() ? reason.trim() : 'Admin işlemi';

        let value = 0;
        if (action !== 'reset') {
            const minimum = action === 'set' ? 0 : 1;
            if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < minimum || amount > MAX_DIAMONDS) {
                return NextResponse.json({ message: 'Geçerli bir miktar belirtin' }, { status: 400 });
            }
            value = amount;
        }

        if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) {
            return NextResponse.json({ message: 'Kullanıcı bulunamadı.' }, { status: 404 });
        }

        const result = await prisma.$transaction(async tx => {
            const wallet = await tx.wallet.upsert({ where: { userId }, update: {}, create: { userId } });
            const before = wallet.diamonds;
            const next =
                action === 'add' ? before + value :
                action === 'remove' ? Math.max(0, before - value) :
                action === 'set' ? value : 0;
            if (next > MAX_DIAMONDS) return { error: 'Bakiye üst sınırı aşılıyor.' as const };

            const delta = next - before;
            if (delta !== 0) {
                await tx.wallet.update({ where: { userId }, data: { diamonds: next } });
                await tx.diamondTransaction.create({
                    data: { userId, type: delta > 0 ? 'admin_add' : 'admin_remove', diamondAmount: Math.abs(delta) },
                });
            }
            await tx.userLog.create({
                data: { userId, action: `Elmas ${LABELS[action as Action]}: ${before} → ${next} (${note}, admin #${admin.adminId})` },
            });
            return { before, next, delta };
        });

        if ('error' in result) return NextResponse.json({ message: result.error }, { status: 400 });
        return NextResponse.json({
            message: `Elmas bakiyesi ${LABELS[action as Action]}`,
            before: result.before,
            diamonds: result.next,
            change: result.delta,
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
