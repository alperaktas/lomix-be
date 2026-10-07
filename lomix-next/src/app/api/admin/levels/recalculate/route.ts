import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { levelForSpend } from '@/lib/level';

/**
 * Tüm kullanıcıların level'ını mevcut eşiklere göre yeniden hesaplar (yukarı ve aşağı).
 * `backfill: true` ise önce totalSpent hediye geçmişinden (gift_logs) yeniden kurulur;
 * mesaj ve hikaye harcamaları geçmişe dönük kayıtlı olmadığı için sayılmaz. Backfill
 * sayacın üzerine yazar, bu yüzden yalnızca ilk kurulumda kullanılmalı.
 */
export async function POST(request: Request) {
    if (!(await requireAdmin(request))) {
        return NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
    }
    try {
        const { backfill } = await request.json().catch(() => ({}));

        const thresholds = await prisma.levelThreshold.findMany({ orderBy: { level: 'asc' } });
        const users = await prisma.user.findMany({ select: { id: true, level: true, totalSpent: true } });

        let spendByUser = new Map<number, number>();
        if (backfill) {
            const sums = await prisma.giftLog.groupBy({ by: ['senderId'], _sum: { totalPrice: true } });
            spendByUser = new Map(sums.map(s => [s.senderId, s._sum.totalPrice ?? 0]));
        }

        const ops = [];
        let changed = 0;
        for (const u of users) {
            const spent = backfill ? (spendByUser.get(u.id) ?? 0) : u.totalSpent;
            const level = levelForSpend(thresholds, spent);
            if (spent !== u.totalSpent || level !== u.level) {
                ops.push(prisma.user.update({ where: { id: u.id }, data: { totalSpent: spent, level } }));
                if (level !== u.level) changed++;
            }
        }
        if (ops.length > 0) await prisma.$transaction(ops);

        return NextResponse.json({ success: true, users: users.length, level_changed: changed, backfilled: !!backfill });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
