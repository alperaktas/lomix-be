import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET: Tekil kullanıcı detay (tüm ilişkiler dahil)
export async function GET(req: Request, { params }: any) {
    try {
        const { id } = await params;
        const userId = Number(id);
        
        if (isNaN(userId)) {
            return NextResponse.json({ message: 'Geçersiz kullanıcı ID' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallet: true,
                bans: { orderBy: { createdAt: 'desc' } },
                agencyMembership: {
                    include: { agency: { select: { id: true, name: true, logo: true } } }
                },
            }
        });

        if (!user) {
            return NextResponse.json({ message: 'Kullanıcı bulunamadı' }, { status: 404 });
        }

        // Takipçi / takip sayıları
        const [followersCount, followingCount] = await Promise.all([
            prisma.userFollow.count({ where: { followingId: userId } }),
            prisma.userFollow.count({ where: { followerId: userId } }),
        ]);

        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json({
            ...userWithoutPassword,
            followersCount,
            followingCount,
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// PUT: Kullanıcı Güncelle
export async function PUT(req: Request, { params }: any) {
    try {
        const { id } = await params;
        const userId = Number(id);
        const body = await req.json();
        const { username, email, role, status, password } = body;

        const updateData: any = {
            username,
            email,
            role,
            status
        };

        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        return NextResponse.json(userWithoutPassword);

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// DELETE: Kullanıcı Sil
export async function DELETE(req: Request, { params }: any) {
    try {
        const { id } = await params;
        const userId = Number(id);

        await prisma.user.delete({
            where: { id: userId }
        });

        return NextResponse.json({ message: 'Kullanıcı silindi' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
