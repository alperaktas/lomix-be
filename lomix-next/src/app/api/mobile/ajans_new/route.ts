import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const agency = await prisma.agency.findUnique({
            where: { ownerId: userId }
        });

        if (!agency) {
            return NextResponse.json({ status: false, message: "Agency not found" }, { status: 404 });
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newMembers = await prisma.agencyMember.findMany({
            where: {
                agencyId: agency.id,
                createdAt: { gte: sevenDaysAgo }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        avatar: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            status: true,
            data: newMembers.map(m => ({
                user_id: String(m.userId),
                username: m.user.fullName || m.user.username,
                avatar: m.user.avatar || "/img/avatars/default.png",
                join_date: m.createdAt.toISOString().split('T')[0]
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
