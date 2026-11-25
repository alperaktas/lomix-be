import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { statsWindows } from '@/lib/publisher';

const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
const LIMIT = 200;

/** Elmas kazancı sayılan işlem türleri ve ekranda görünen metinleri. Bonus/görev kazançları bu listede olmadığı için gelmez. */
const TX_LABELS: Record<string, { from: string; item: string }> = {
    message_earning: { from: 'Mesaj kazancı', item: 'Ücretli mesaj' },
    agency_prim: { from: 'Ajans primi', item: 'Prim' },
    withdraw_refund: { from: 'Çekim iadesi', item: 'İade' },
};

/** Türkiye saatiyle YYYY-MM-DD */
function trDate(d: Date): string {
    return new Date(d.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * @swagger
 * /api/mobile/diamond/history:
 *   post:
 *     summary: Elmas kazanç geçmişi (günlük kayıtlar)
 *     description: |
 *       Kullanıcının elmas kazanç kayıtları, en yeniden eskiye (en fazla 200). Kaynaklar: kendisine gelen hediyeler (oda hediyeleri
 *       dahil), mesaj kazancı, ajans primi ve çekim iadeleri. Çekim ve bozdurma harcamaları burada değil, çekim merkezinde ve
 *       `diamond/data` içinde. `year` ve `month` (1-12) verilirse yalnızca o ayın (Türkiye saati) kayıtları döner; verilmezse
 *       tüm zamanların son 200 kaydı. `daily_income` bugünkü (Türkiye saati) kazançtır, iadeler dahil değildir.
 *       `date` Türkiye saatiyle `YYYY-MM-DD`. `user_id` isteğe bağlıdır, verilirse token sahibiyle aynı olmalıdır (403).
 *     tags: [Mobile Diamond]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *               year:
 *                 type: integer
 *               month:
 *                 type: integer
 *     responses:
 *       200:
 *         description: data.balance, data.daily_income, data.records[] (date, amount, from, item)
 *       400:
 *         description: Geçersiz year/month
 *       403:
 *         description: Başka kullanıcının verisi
 */
export async function POST(request: Request) {
    try {
        const authId = await getCurrentUserId(request);
        if (!authId) return NextResponse.json({ status: false, success: false, message: 'Yetkisiz erişim.' }, { status: 401 });

        const body = await request.json().catch(() => ({}));
        const rawId = body?.user_id;
        if (rawId !== undefined && rawId !== null && rawId !== '' && Number(rawId) !== authId) {
            return NextResponse.json({ status: false, success: false, message: 'Bu veriye erişim yetkiniz yok.' }, { status: 403 });
        }

        // Ay filtresi (Türkiye saati): [ayın 1'i 00:00, sonraki ayın 1'i 00:00)
        let range: { gte: Date; lt: Date } | null = null;
        const hasYear = body?.year !== undefined && body?.year !== null && body?.year !== '';
        const hasMonth = body?.month !== undefined && body?.month !== null && body?.month !== '';
        if (hasYear || hasMonth) {
            const year = Number(body.year), month = Number(body.month);
            if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
                return NextResponse.json({ status: false, success: false, message: 'year ve month (1-12) geçerli tamsayılar olmalıdır.' }, { status: 400 });
            }
            range = {
                gte: new Date(Date.UTC(year, month - 1, 1) - TR_OFFSET_MS),
                lt: new Date(Date.UTC(year, month, 1) - TR_OFFSET_MS),
            };
        }
        const dateFilter = range ? { createdAt: range } : {};

        const [wallet, gifts, roomGifts, txs] = await Promise.all([
            prisma.wallet.findUnique({ where: { userId: authId }, select: { diamonds: true } }),
            prisma.giftLog.findMany({
                where: { receiverId: authId, diamondAmount: { gt: 0 }, ...dateFilter },
                orderBy: { createdAt: 'desc' },
                take: LIMIT,
                select: { createdAt: true, diamondAmount: true, amount: true, gift: { select: { name: true } }, sender: { select: { username: true, fullName: true } } },
            }),
            // Alıcısı kaydedilmemiş eski oda hediyeleri oda sahibine yazılmıştı
            prisma.giftLog.findMany({
                where: { receiverId: null, room: { ownerId: authId }, diamondAmount: { gt: 0 }, ...dateFilter },
                orderBy: { createdAt: 'desc' },
                take: LIMIT,
                select: { createdAt: true, diamondAmount: true, amount: true, gift: { select: { name: true } }, sender: { select: { username: true, fullName: true } } },
            }),
            prisma.diamondTransaction.findMany({
                where: { userId: authId, type: { in: Object.keys(TX_LABELS) }, ...dateFilter },
                orderBy: { createdAt: 'desc' },
                take: LIMIT,
                select: { createdAt: true, diamondAmount: true, type: true },
            }),
        ]);

        type Row = { at: Date; amount: number; from: string; item: string; income: boolean };
        const rows: Row[] = [
            ...[...gifts, ...roomGifts].map(g => ({
                at: g.createdAt,
                amount: g.diamondAmount,
                from: `Hediye - ${g.sender.fullName || g.sender.username}`,
                item: g.amount > 1 ? `${g.gift.name} x${g.amount}` : g.gift.name,
                income: true,
            })),
            ...txs.map(t => ({
                at: t.createdAt,
                amount: t.diamondAmount,
                from: TX_LABELS[t.type].from,
                item: TX_LABELS[t.type].item,
                income: t.type !== 'withdraw_refund',
            })),
        ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, LIMIT);

        const todayStart = statsWindows().daily;
        const [todayGifts, todayRoomGifts, todayTx] = await Promise.all([
            prisma.giftLog.aggregate({ where: { receiverId: authId, createdAt: { gte: todayStart } }, _sum: { diamondAmount: true } }),
            prisma.giftLog.aggregate({ where: { receiverId: null, room: { ownerId: authId }, createdAt: { gte: todayStart } }, _sum: { diamondAmount: true } }),
            prisma.diamondTransaction.aggregate({ where: { userId: authId, type: { in: ['message_earning', 'agency_prim'] }, createdAt: { gte: todayStart } }, _sum: { diamondAmount: true } }),
        ]);
        const dailyIncome = (todayGifts._sum.diamondAmount ?? 0) + (todayRoomGifts._sum.diamondAmount ?? 0) + (todayTx._sum.diamondAmount ?? 0);

        return NextResponse.json({
            status: true,
            success: true,
            message: 'Elmas geçmişi getirildi.',
            data: {
                balance: wallet?.diamonds ?? 0,
                daily_income: dailyIncome,
                records: rows.map(r => ({ date: trDate(r.at), amount: r.amount, from: r.from, item: r.item })),
            },
        });
    } catch (error: any) {
        console.error('diamond/history error:', error);
        return NextResponse.json({ status: false, success: false, message: 'Beklenmeyen bir hata oluştu.' }, { status: 500 });
    }
}
