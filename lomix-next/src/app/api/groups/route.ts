import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const groups = await prisma.group.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
        return NextResponse.json(groups);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, description } = body;

        const newGroup = await prisma.group.create({
            data: {
                name,
                description
            }
        });

        return NextResponse.json(newGroup, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
