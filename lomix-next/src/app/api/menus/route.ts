import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const menus = await prisma.menu.findMany({
            orderBy: {
                order: 'asc'
            }
        });
        return NextResponse.json(menus);
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Sunucu hatası' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, url, icon, parentId, order } = body;

        const newMenu = await prisma.menu.create({
            data: {
                title,
                url,
                icon,
                parentId: parentId ? Number(parentId) : null,
                order: order ? Number(order) : 0
            }
        });

        return NextResponse.json(newMenu, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
