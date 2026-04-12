import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

export async function GET(request: Request) {
    try {
        const agencyOwnerId = await getCurrentUserId(request);
        if (!agencyOwnerId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const targetUserId = searchParams.get('userId');

        if (!targetUserId) {
            return NextResponse.json({ status: false, message: "userId parameter is required" }, { status: 400 });
        }

        // @ts-ignore
        const agency = await prisma.agency.findUnique({
            where: { ownerId: agencyOwnerId }
        });

        if (!agency) {
            return NextResponse.json({ status: false, message: "Ajans sahibi değilsiniz" }, { status: 403 });
        }

        // Üyeyi onayla
        // @ts-ignore
        await prisma.agencyMember.update({
            where: {
                userId: parseInt(targetUserId, 10),
                agencyId: agency.id
            },
            data: { status: "approved" }
        });

        return NextResponse.json({
            status: true,
            message: "Yayıncı onaylandı..",
            data: {}
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
