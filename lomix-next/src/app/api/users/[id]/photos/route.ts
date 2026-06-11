import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { put, del } from '@vercel/blob';

const MAX_PHOTOS = 4;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const photos = await prisma.userPhoto.findMany({
        where: { userId: Number(id) },
        orderBy: { order: 'asc' },
        select: { id: true, url: true, order: true, createdAt: true },
    });
    return NextResponse.json({ photos });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const userId = Number(id);

        const count = await prisma.userPhoto.count({ where: { userId } });
        if (count >= MAX_PHOTOS) {
            return NextResponse.json({ message: `En fazla ${MAX_PHOTOS} fotoğraf yükleyebilirsiniz.` }, { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get('photo') as File | null;
        if (!file || file.size === 0) {
            return NextResponse.json({ message: 'Fotoğraf seçilmedi.' }, { status: 400 });
        }

        const ext = file.name.split('.').pop();
        const blob = await put(`user-photos/user_${userId}_${Date.now()}.${ext}`, file, { access: 'public' });

        const photo = await prisma.userPhoto.create({
            data: { userId, url: blob.url, order: count },
            select: { id: true, url: true, order: true, createdAt: true },
        });

        return NextResponse.json({ photo });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const photoId = Number(searchParams.get('photoId'));

        if (!photoId) {
            return NextResponse.json({ message: 'photoId gereklidir.' }, { status: 400 });
        }

        const photo = await prisma.userPhoto.findFirst({
            where: { id: photoId, userId: Number(id) },
        });
        if (!photo) {
            return NextResponse.json({ message: 'Fotoğraf bulunamadı.' }, { status: 404 });
        }

        await prisma.userPhoto.delete({ where: { id: photoId } });

        try { await del(photo.url); } catch {}

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
