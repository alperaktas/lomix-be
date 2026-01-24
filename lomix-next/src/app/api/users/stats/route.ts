import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const totalUsers = await prisma.user.count();
        const activeUsers = await prisma.user.count({ where: { status: 'active' } });
        const pendingUsers = await prisma.user.count({ where: { status: 'pending' } });

        // Son 7 günde kayıt olanlar
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const newUsers = await prisma.user.count({
            where: { createdAt: { gte: lastWeek } }
        });

        return NextResponse.json({
            total: totalUsers,
            active: activeUsers,
            pending: pendingUsers,
            newLastWeek: newUsers
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
