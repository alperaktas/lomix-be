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
            where: { ownerId: userId },
            include: {
                members: {
                    where: { status: "pending" },
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
                }
            }
        });

        if (!agency) {
            return NextResponse.json({ status: false, message: "Ajans bulunamadı" }, { status: 404 });
        }

        return NextResponse.json({
            status: true,
            message: "Yayıncı onay listesi yüklendi",
            data: {
                publisher_id: String(userId),
                publisher_name: agency.name,
                followers: agency.members.map((member: any) => ({
                    user_id: String(member.user.id),
                    name: member.user.fullName || member.user.username,
                    profile_picture_url: member.user.avatar || `https://i.pravatar.cc/150?u=${member.user.id}`
                }))
            }
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
