import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/admin/transactions?page=1&user_id=X&type=gift
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = 30;
    const skip = (page - 1) * limit;
    const userId = searchParams.get('user_id') ? Number(searchParams.get('user_id')) : undefined;
    const type = searchParams.get('type') || undefined;

    const where: any = {};
    if (userId) where.OR = [{ fromUserId: userId }, { toUserId: userId }];
    if (type) where.type = type;

    const [transactions, total] = await Promise.all([
        prisma.walletTransaction.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                fromUser: { select: { id: true, username: true, fullName: true, avatar: true } },
                toUser:   { select: { id: true, username: true, fullName: true, avatar: true } },
            },
        }),
        prisma.walletTransaction.count({ where }),
    ]);

    return NextResponse.json({
        transactions: transactions.map(t => ({
            id: t.id,
            amount: t.amount,
            type: t.type,
            description: t.description,
            createdAt: t.createdAt,
            fromUser: t.fromUser,
            toUser: t.toUser,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
    });
}
