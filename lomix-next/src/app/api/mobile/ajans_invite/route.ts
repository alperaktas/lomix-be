import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        // @ts-ignore
        const agency = await prisma.agency.findUnique({
            where: { ownerId: userId }
        });

        if (!agency) {
            return NextResponse.json({ status: false, message: "Ajans bulunamadı" }, { status: 404 });
        }

        // Rastgele 8 haneli kod oluştur
        const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 gün geçerli

        // @ts-ignore
        await prisma.agencyInvite.create({
            data: {
                agencyId: agency.id,
                code: inviteCode,
                expiresAt: expiresAt
            }
        });

        return NextResponse.json({
            status: true,
            message: "Link oluşturuldu.",
            data: {
                url: `https://lomix.com/agency/join/${inviteCode}`
            }
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
