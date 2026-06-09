import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    const prices = await prisma.storyPrice.findMany({ orderBy: { durationHours: 'asc' } });
    return NextResponse.json({ prices });
}

export async function POST(req: Request) {
    try {
        const { durationHours, cost, label } = await req.json();
        if (!durationHours || cost === undefined || !label) {
            return NextResponse.json({ error: 'durationHours, cost ve label zorunludur.' }, { status: 400 });
        }
        const existing = await prisma.storyPrice.findFirst({ where: { durationHours: Number(durationHours) } });
        if (existing) {
            return NextResponse.json({ error: 'Bu süre için zaten fiyat var.' }, { status: 409 });
        }
        const price = await prisma.storyPrice.create({
            data: { durationHours: Number(durationHours), cost: Number(cost), label },
        });
        return NextResponse.json({ price });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { id, durationHours, cost, label } = await req.json();
        if (!id) return NextResponse.json({ error: 'id zorunludur.' }, { status: 400 });
        const price = await prisma.storyPrice.update({
            where: { id: Number(id) },
            data: {
                ...(durationHours !== undefined && { durationHours: Number(durationHours) }),
                ...(cost !== undefined && { cost: Number(cost) }),
                ...(label !== undefined && { label }),
            },
        });
        return NextResponse.json({ price });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = Number(searchParams.get('id'));
        if (!id) return NextResponse.json({ error: 'id zorunludur.' }, { status: 400 });
        await prisma.storyPrice.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
