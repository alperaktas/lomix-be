import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { COIN_LEDGER } from '@/lib/coin-ledger';

const PAGE_SIZE = 30;
const TR_OFFSET_MS = 3 * 3600 * 1000;


type Row = {
    key: string; at: Date; type: string; amount: bigint | number; direction: 'in' | 'out';
    user_id: number | null; other_id: number | null; description: string | null;
};

/** YYYY-MM-DD, Türkiye gününün başı; geçersizse null. */
function trDayStart(raw: string | null): Date | null {
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const d = new Date(Date.parse(`${raw}T00:00:00Z`) - TR_OFFSET_MS);
    return Number.isNaN(d.getTime()) ? null : d;
}

// GET /api/admin/coin-report?user_id=&kind=all|load|spend&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });

    try {
        const sp = new URL(request.url).searchParams;
        const page = Math.max(1, Math.floor(Number(sp.get('page')) || 1));
        const kind = sp.get('kind') || 'all';
        if (!['all', 'load', 'spend'].includes(kind)) return NextResponse.json({ error: 'kind all, load veya spend olmalıdır.' }, { status: 400 });

        const userIdRaw = sp.get('user_id');
        const userId = userIdRaw ? Number(userIdRaw) : null;
        if (userIdRaw && (!Number.isInteger(userId) || (userId as number) < 1)) return NextResponse.json({ error: 'Geçersiz user_id.' }, { status: 400 });

        const from = trDayStart(sp.get('from'));
        const toDay = trDayStart(sp.get('to'));
        if ((sp.get('from') && !from) || (sp.get('to') && !toDay)) return NextResponse.json({ error: 'Tarih YYYY-MM-DD biçiminde olmalıdır.' }, { status: 400 });

        const conds: Prisma.Sql[] = [Prisma.sql`TRUE`];
        if (userId) conds.push(Prisma.sql`user_id = ${userId}`);
        if (kind === 'load') conds.push(Prisma.sql`direction = 'in'`);
        if (kind === 'spend') conds.push(Prisma.sql`direction = 'out'`);
        if (from) conds.push(Prisma.sql`at >= ${from.toISOString()}::timestamp`);
        if (toDay) conds.push(Prisma.sql`at < ${new Date(toDay.getTime() + 24 * 3600 * 1000).toISOString()}::timestamp`);
        const where = Prisma.join(conds, ' AND ');

        const [rows, [totals]] = await Promise.all([
            prisma.$queryRaw<Row[]>(Prisma.sql`
                WITH ledger AS (${COIN_LEDGER})
                SELECT key, at, type, amount, direction, user_id, other_id, description
                FROM ledger WHERE ${where}
                ORDER BY at DESC, key DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`),
            prisma.$queryRaw<{ total: number; loaded: number; spent: number }[]>(Prisma.sql`
                WITH ledger AS (${COIN_LEDGER})
                SELECT COUNT(*)::int AS total,
                    COALESCE(SUM(amount) FILTER (WHERE direction = 'in'), 0)::float8 AS loaded,
                    COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0)::float8 AS spent
                FROM ledger WHERE ${where}`),
        ]);

        const ids = [...new Set(rows.flatMap(r => [r.user_id, r.other_id]).filter((v): v is number => v !== null))];
        const people = ids.length
            ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, fullName: true, avatar: true } })
            : [];
        const byId = new Map(people.map(p => [p.id, p]));

        const wallet = userId ? await prisma.wallet.findUnique({ where: { userId }, select: { balance: true, diamonds: true } }) : null;

        return NextResponse.json({
            rows: rows.map(r => ({
                key: r.key,
                createdAt: r.at,
                type: r.type,
                direction: r.direction,
                amount: Number(r.amount),
                user: r.user_id ? byId.get(r.user_id) ?? { id: r.user_id, username: `#${r.user_id}`, fullName: null, avatar: null } : null,
                other: r.other_id ? byId.get(r.other_id) ?? { id: r.other_id, username: `#${r.other_id}`, fullName: null, avatar: null } : null,
                description: r.description,
            })),
            total: totals.total,
            page,
            totalPages: Math.max(1, Math.ceil(totals.total / PAGE_SIZE)),
            summary: { loaded: Math.round(totals.loaded), spent: Math.round(totals.spent), net: Math.round(totals.loaded - totals.spent) },
            wallet: wallet ? { balance: wallet.balance, diamonds: wallet.diamonds } : null,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
