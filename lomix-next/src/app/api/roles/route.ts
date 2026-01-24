import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const roles = await prisma.role.findMany({
            orderBy: { createdAt: 'asc' }
        });
        return NextResponse.json(roles);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name } = body;

        if (!name) return NextResponse.json({ message: 'Rol adı gerekli' }, { status: 400 });

        const role = await prisma.role.create({
            data: { name }
        });

        return NextResponse.json(role, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
