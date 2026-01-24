import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET: Tüm kullanıcıları listele
export async function GET(req: Request) {
    try {
        const users = await prisma.user.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            // Şifre alanını select ile hariç tutabiliriz
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                // Diğer gerekli alanlar...
            }
        });
        return NextResponse.json(users);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// POST: Yeni kullanıcı oluştur
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, email, password, role } = body;

        if (!username || !email || !password) {
            return NextResponse.json({ message: 'Tüm alanları doldurun.' }, { status: 400 });
        }

        // Benzersizlik kontrolü
        const existingUser = await prisma.user.findFirst({
            where: { email } // veya username için de bakılabilir
        });

        if (existingUser) {
            return NextResponse.json({ message: 'Bu email zaten kayıtlı.' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword, // Hashlenmiş şifre
                role: role || 'user',
                status: 'active'
            }
        });

        // Şifreyi dönerken gizle
        const { password: _, ...userWithoutPassword } = newUser;

        return NextResponse.json(userWithoutPassword, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
