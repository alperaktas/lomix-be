import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Kullanıcıya yapılan şikayetler (UserReport tablosu)
export async function GET(_req: Request, { params }: any) {
    try {
        const { id } = await params;
        const reports = await prisma.userReport.findMany({
            where: { reportedId: Number(id) },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, username: true, fullName: true } } },
        });

        return NextResponse.json({
            reports: reports.map(r => ({
                id: r.id,
                userId: r.userId,
                reporterName: r.user.fullName || r.user.username,
                reason: r.reason,
                createdAt: r.createdAt,
            })),
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
