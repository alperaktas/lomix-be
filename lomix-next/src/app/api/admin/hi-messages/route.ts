import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const TEXT_MAX = 500;
const LIST_MAX = 100;

export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    const messages = await prisma.hiMessage.findMany({ orderBy: { createdAt: 'desc' }, take: LIST_MAX });
    return NextResponse.json({ messages });
}

export async function POST(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const { text } = await request.json();
        const clean = typeof text === 'string' ? text.trim() : '';
        if (!clean) return NextResponse.json({ error: 'Mesaj metni zorunludur.' }, { status: 400 });
        if (clean.length > TEXT_MAX) return NextResponse.json({ error: `Mesaj en fazla ${TEXT_MAX} karakter olabilir.` }, { status: 400 });

        if ((await prisma.hiMessage.count()) >= LIST_MAX) {
            return NextResponse.json({ error: `En fazla ${LIST_MAX} mesaj tanımlanabilir.` }, { status: 400 });
        }
        if (await prisma.hiMessage.findFirst({ where: { text: { equals: clean, mode: 'insensitive' } } })) {
            return NextResponse.json({ error: 'Bu mesaj zaten tanımlı.' }, { status: 409 });
        }

        const message = await prisma.hiMessage.create({ data: { text: clean } });
        return NextResponse.json({ message });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const { id, text, isActive } = await request.json();
        if (!id) return NextResponse.json({ error: 'id zorunludur.' }, { status: 400 });

        const data: { text?: string; isActive?: boolean } = {};
        if (text !== undefined) {
            const clean = typeof text === 'string' ? text.trim() : '';
            if (!clean) return NextResponse.json({ error: 'Mesaj metni boş olamaz.' }, { status: 400 });
            if (clean.length > TEXT_MAX) return NextResponse.json({ error: `Mesaj en fazla ${TEXT_MAX} karakter olabilir.` }, { status: 400 });
            const dup = await prisma.hiMessage.findFirst({
                where: { text: { equals: clean, mode: 'insensitive' }, id: { not: Number(id) } },
            });
            if (dup) return NextResponse.json({ error: 'Bu mesaj zaten tanımlı.' }, { status: 409 });
            data.text = clean;
        }
        if (isActive !== undefined) data.isActive = Boolean(isActive);
        if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Güncellenecek alan yok.' }, { status: 400 });

        const exists = await prisma.hiMessage.findUnique({ where: { id: Number(id) }, select: { id: true } });
        if (!exists) return NextResponse.json({ error: 'Mesaj bulunamadı.' }, { status: 404 });

        const message = await prisma.hiMessage.update({ where: { id: Number(id) }, data });
        return NextResponse.json({ message });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const id = Number(new URL(request.url).searchParams.get('id'));
        if (!id) return NextResponse.json({ error: 'id zorunludur.' }, { status: 400 });
        const result = await prisma.hiMessage.deleteMany({ where: { id } });
        if (result.count === 0) return NextResponse.json({ error: 'Mesaj bulunamadı.' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
