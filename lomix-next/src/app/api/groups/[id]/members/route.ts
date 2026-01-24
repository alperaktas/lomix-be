import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const groupId = Number(id);

        const groupMembers = await prisma.userGroup.findMany({
            where: { groupId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        avatar: true
                    }
                }
            }
        });

        // Sadece kullanıcı listesini dön (UserGroup objesini flat hale getir)
        const users = groupMembers.map(gm => gm.user);

        return NextResponse.json(users);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
