import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUserId } from '@/lib/current-user';
import { COIN_LEDGER, COIN_TYPE_LABELS } from '@/lib/coin-ledger';

const TYPES = ['purchase', 'load', 'spend', 'all'] as const;
type HistoryType = (typeof TYPES)[number];
/** Bir ayda en fazla bu kadar hareket listelenir; fazlası varsa meta.has_more true olur. */
const MAX_ROWS = 500;
/** Admin işlemlerinin iç açıklaması ve yöneticinin kimliği kullanıcıya gösterilmez. */
const HIDDEN_DETAIL_TYPES = ['admin_coin_add', 'admin_coin_remove'];

const directionCond = (type: HistoryType) =>
    type === 'load' ? Prisma.sql`AND direction = 'in'` : type === 'spend' ? Prisma.sql`AND direction = 'out'` : Prisma.empty;

/** Listenin kaynağı: satın almalar ya da birleşik coin hareketleri (yükleme + harcama). */
const source = (type: HistoryType) => type === 'purchase'
    ? Prisma.sql`SELECT user_id, purchased_at AS at FROM coin_purchases`
    : Prisma.sql`SELECT user_id, at FROM (${COIN_LEDGER}) l WHERE TRUE ${directionCond(type)}`;

/** Ay/yıl verilmediyse kullanıcının en son hareketi olan aya gidilir. */
async function resolvePeriod(userId: number, month: number | null, year: number | null, type: HistoryType) {
    if (month && year) return { month, year };

    const rows = await prisma.$queryRaw<{ month: number; year: number }[]>(Prisma.sql`
        SELECT EXTRACT(MONTH FROM at)::int AS month, EXTRACT(YEAR FROM at)::int AS year
        FROM (${source(type)}) s
        WHERE user_id = ${userId}
          ${year ? Prisma.sql`AND EXTRACT(YEAR FROM at) = ${year}` : Prisma.empty}
          ${month ? Prisma.sql`AND EXTRACT(MONTH FROM at) = ${month}` : Prisma.empty}
        ORDER BY at DESC
        LIMIT 1
    `);
    return rows[0] ? { month: rows[0].month, year: rows[0].year } : null;
}

type LedgerRow = { key: string; at: Date; type: string; amount: bigint | number; direction: 'in' | 'out'; other_id: number | null; description: string | null };

/**
 * @swagger
 * /api/mobile/coin/purchase-history:
 *   post:
 *     summary: Kullanıcının aylık coin geçmişi (yükleme ve harcamaların hepsi)
 *     description: |
 *       Kullanıcı token'dan belirlenir; gövdedeki `user_id` verilirse token'daki kullanıcıyla aynı olmalıdır (aksi halde 403).
 *       Ay/yıl verilmezse kullanıcının en son hareketi olan ay döner.
 *
 *       Varsayılan olarak **tüm hareketler** döner (en yeni en üstte): coin satın alma, yönetici ekleme, elmas bozdurma,
 *       mesaj iadesi (yükleme, `direction: in`) ile hediye, hikaye, ücretli mesaj ve yönetici düzeltmesi (harcama,
 *       `direction: out`). İsteğe bağlı `type` ile daraltılabilir: `load` (yüklemeler), `spend` (harcamalar) ya da
 *       `purchase` (yalnızca satın alınan paketler, eski biçim).
 *
 *       Satır alanları: `date`, `created_at`, `type`, `label`, `direction`, `amount` (her zaman pozitif), `description`,
 *       `other_user` (hediye alıcısı / mesaj alıcısı, yoksa null) ve satın alma satırlarında `unit_price`, `total_price`,
 *       `tl_amount` (diğerlerinde null). `meta`: `type`, `period`, `summary` (`loaded`, `spent`, `net`), `has_more`.
 *       Hikaye ve mesaj harcamaları yalnızca bu özelliğin yayına girmesinden sonrası için listelenir.
 *     tags: [Mobile Coin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: Opsiyonel; verilirse token'daki kullanıcı olmalıdır
 *               month:
 *                 type: integer
 *               year:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [all, load, spend, purchase]
 *                 default: all
 *     responses:
 *       200:
 *         description: Coin geçmişi
 *       400:
 *         description: Geçersiz type, ay ya da yıl
 *       403:
 *         description: user_id token'daki kullanıcıya ait değil
 */
export async function POST(request: Request) {
    try {
        const authId = await getCurrentUserId(request);
        if (!authId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const body = await request.json().catch(() => ({}));
        // Yalnızca token'daki kullanıcının geçmişi döner; gövdedeki user_id başkasını işaret edemez.
        const userId = Number(body.user_id ?? authId);
        if (userId !== authId) return ApiResponseHelper.error("Bu veriye erişim yetkiniz yok.", 403);

        const type = (body.type ?? 'all') as HistoryType;
        if (!TYPES.includes(type)) return ApiResponseHelper.error(`type ${TYPES.join(', ')} değerlerinden biri olmalıdır.`, 400);

        const month = body.month ? Number(body.month) : null;
        const year = body.year ? Number(body.year) : null;
        if ((month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) || (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100))) {
            return ApiResponseHelper.error("Geçersiz ay veya yıl.", 400);
        }

        const period = await resolvePeriod(userId, month, year, type);
        if (!period) {
            return ApiResponseHelper.success([], type === 'purchase' ? "Coin satın alma geçmişi bulunamadı." : "Coin hareketi bulunamadı.");
        }

        const start = new Date(Date.UTC(period.year, period.month - 1, 1));
        const end = new Date(Date.UTC(period.year, period.month, 1));
        const mm = String(period.month).padStart(2, '0');

        if (type === 'purchase') {
            const purchases = await prisma.coinPurchase.findMany({
                where: { userId, purchasedAt: { gte: start, lt: end } },
                orderBy: { purchasedAt: 'desc' },
            });

            const data = purchases.map(p => ({
                date: p.purchasedAt.toISOString().slice(0, 10),
                amount: p.amount,
                unit_price: p.unitPrice,
                total_price: p.totalPrice,
                tl_amount: p.tlAmount,
            }));

            return ApiResponseHelper.success(data, `${mm} - ${period.year} ait coin geçmişi`);
        }

        const inRange = Prisma.sql`user_id = ${userId} AND at >= ${start.toISOString()}::timestamp AND at < ${end.toISOString()}::timestamp`;
        const [rows, [totals]] = await Promise.all([
            prisma.$queryRaw<LedgerRow[]>(Prisma.sql`
                WITH ledger AS (${COIN_LEDGER})
                SELECT key, at, type, amount, direction, other_id, description
                FROM ledger WHERE ${inRange} ${directionCond(type)}
                ORDER BY at DESC, key DESC LIMIT ${MAX_ROWS + 1}`),
            prisma.$queryRaw<{ loaded: number; spent: number }[]>(Prisma.sql`
                WITH ledger AS (${COIN_LEDGER})
                SELECT COALESCE(SUM(amount) FILTER (WHERE direction = 'in'), 0)::float8 AS loaded,
                       COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0)::float8 AS spent
                FROM ledger WHERE ${inRange}`),
        ]);

        const hasMore = rows.length > MAX_ROWS;
        const page = rows.slice(0, MAX_ROWS);

        const otherIds = [...new Set(page.filter(r => r.other_id && !HIDDEN_DETAIL_TYPES.includes(r.type)).map(r => r.other_id as number))];
        const people = otherIds.length
            ? await prisma.user.findMany({ where: { id: { in: otherIds } }, select: { id: true, username: true, fullName: true } })
            : [];
        const nameOf = new Map(people.map(p => [p.id, p.fullName || p.username]));

        // Satın alma satırları eski alanlarını (birim fiyat, toplam, TL) korur.
        const purchaseIds = page.filter(r => r.type === 'purchase').map(r => Number(r.key.replace('buy-', '')));
        const purchases = purchaseIds.length ? await prisma.coinPurchase.findMany({ where: { id: { in: purchaseIds } } }) : [];
        const purchaseOf = new Map(purchases.map(p => [`buy-${p.id}`, p]));

        const data = page.map(r => {
            const hidden = HIDDEN_DETAIL_TYPES.includes(r.type);
            const purchase = purchaseOf.get(r.key);
            return {
                date: r.at.toISOString().slice(0, 10),
                created_at: r.at.toISOString(),
                type: r.type,
                label: COIN_TYPE_LABELS[r.type] ?? r.type,
                direction: r.direction,
                amount: Number(r.amount),
                description: hidden ? null : r.description,
                other_user: !hidden && r.other_id ? { id: r.other_id, name: nameOf.get(r.other_id) ?? `#${r.other_id}` } : null,
                unit_price: purchase?.unitPrice ?? null,
                total_price: purchase?.totalPrice ?? null,
                tl_amount: purchase?.tlAmount ?? null,
            };
        });

        const loaded = Math.round(totals.loaded), spent = Math.round(totals.spent);
        return ApiResponseHelper.success(data, `${mm} - ${period.year} ait coin hareketleri`, 200, {
            type,
            period: { month: period.month, year: period.year },
            summary: { loaded, spent, net: loaded - spent },
            has_more: hasMore,
        });
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
