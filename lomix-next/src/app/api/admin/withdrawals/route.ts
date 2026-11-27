import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { createNotification } from '@/lib/notifications';

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });
const STATUSES = ['pending', 'completed', 'rejected'];
const PAGE_SIZE = 50;

// GET ?status=pending|completed|rejected&page=1
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const where = status && STATUSES.includes(status) ? { status } : {};

    const [items, total, grouped] = await Promise.all([
        prisma.diamondWithdrawal.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            include: { user: { select: { id: true, username: true, fullName: true, email: true, phone: true } } },
        }),
        prisma.diamondWithdrawal.count({ where }),
        prisma.diamondWithdrawal.groupBy({ by: ['status'], _count: { _all: true }, _sum: { diamondAmount: true } }),
    ]);

    return NextResponse.json({
        withdrawals: items.map(w => ({
            id: w.id,
            diamondAmount: w.diamondAmount,
            methodName: w.methodName,
            status: w.status,
            description: w.description,
            bankName: w.bankName,
            iban: w.iban,
            accountHolder: w.accountHolder,
            createdAt: w.createdAt,
            processedAt: w.processedAt,
            user: w.user,
        })),
        total,
        totalPages: Math.ceil(total / PAGE_SIZE) || 1,
        counts: Object.fromEntries(grouped.map(g => [g.status, g._count._all])),
        sums: Object.fromEntries(grouped.map(g => [g.status, g._sum.diamondAmount ?? 0])),
    });
}

/**
 * PUT { id, action: 'complete' | 'reject', description? }
 * complete: ödeme yapıldı; `description` (referans no) kullanıcıya görünür. reject: talep reddedilir ve elmas iade edilir.
 * Yalnızca bekleyen talepler işlenir (aynı talep iki kez iade edilemez).
 */
export async function PUT(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const body = await request.json().catch(() => null);
        const id = Number(body?.id);
        if (!Number.isInteger(id) || id < 1) return err('id zorunludur.', 400);
        const action = body?.action;
        if (action !== 'complete' && action !== 'reject') return err("action 'complete' veya 'reject' olmalıdır.", 400);
        const description = typeof body.description === 'string' ? body.description.trim().slice(0, 200) : '';

        const withdrawal = await prisma.diamondWithdrawal.findUnique({ where: { id } });
        if (!withdrawal) return err('Çekim talebi bulunamadı.', 404);
        if (withdrawal.status !== 'pending') return err('Bu talep zaten işlenmiş.', 409);

        const nextStatus = action === 'complete' ? 'completed' : 'rejected';
        const done = await prisma.$transaction(async tx => {
            // Koşullu geçiş: aynı anda iki işlem aynı talebi işleyemez
            const flipped = await tx.diamondWithdrawal.updateMany({
                where: { id, status: 'pending' },
                data: { status: nextStatus, processedAt: new Date(), ...(description ? { description } : {}) },
            });
            if (flipped.count === 0) return false;
            if (action === 'reject') {
                await tx.wallet.upsert({
                    where: { userId: withdrawal.userId },
                    update: { diamonds: { increment: withdrawal.diamondAmount } },
                    create: { userId: withdrawal.userId, balance: 0, diamonds: withdrawal.diamondAmount },
                });
                await tx.diamondTransaction.create({
                    data: { userId: withdrawal.userId, type: 'withdraw_refund', diamondAmount: withdrawal.diamondAmount },
                });
            }
            return true;
        });
        if (!done) return err('Bu talep zaten işlenmiş.', 409);

        const amount = withdrawal.diamondAmount.toLocaleString('tr-TR');
        await createNotification({
            audience: 'user',
            targetUserId: withdrawal.userId,
            type: 'diamond_withdrawal',
            title: action === 'complete' ? 'Elmas çekiminiz tamamlandı' : 'Elmas çekiminiz reddedildi',
            body: action === 'complete'
                ? `${amount} elmaslık çekim talebiniz tamamlandı.${description ? ` ${description}` : ''}`
                : `${amount} elmaslık çekim talebiniz reddedildi, elmaslarınız hesabınıza iade edildi.${description ? ` ${description}` : ''}`,
            data: { withdrawal_id: String(id), status: nextStatus },
        }).catch(() => {});

        return NextResponse.json({ success: true, status: nextStatus });
    } catch (error: any) {
        return err(error.message, 500);
    }
}
