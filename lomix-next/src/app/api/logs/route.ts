import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        // Son 100 logu getir
        const logs = await prisma.userLog.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { // İlişkili kullanıcı bilgisi
                    select: { username: true }
                }
            }
        });
        return NextResponse.json(logs);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
