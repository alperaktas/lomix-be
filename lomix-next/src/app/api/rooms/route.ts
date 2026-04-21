import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 20;
        const skip = (page - 1) * limit;
        const search = searchParams.get('search') || '';

        const where = search
            ? { name: { contains: search, mode: 'insensitive' as const } }
            : {};

        const [rooms, total] = await Promise.all([
            prisma.room.findMany({
                where,
                include: {
                    owner: { select: { id: true, username: true, avatar: true } },
                    _count: { select: { participants: true, reports: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.room.count({ where }),
        ]);

        return NextResponse.json({
            rooms,
            meta: { total, page, totalPages: Math.ceil(total / limit) },
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
