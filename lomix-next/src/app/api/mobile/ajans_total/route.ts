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

        const allMembers = await prisma.agencyMember.findMany({
            where: { agencyId: agency.id },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        avatar: true
                    }
                }
            }
        });

        return NextResponse.json({
            status: true,
            total_count: allMembers.length,
            data: allMembers.map(m => ({
                user_id: String(m.userId),
                username: m.user.fullName || m.user.username,
                avatar: m.user.avatar || "/img/avatars/default.png",
                status: m.status
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
