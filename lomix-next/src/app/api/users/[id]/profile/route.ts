import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';

export async function PUT(req: Request, { params }: any) {
    try {
        const { id } = await params;
        const contentType = req.headers.get('content-type') || '';

        let username: string | undefined;
        let fullName: string | undefined;
        let description: string | undefined;
        let avatar: string | undefined;

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            username = formData.get('username') as string | undefined || undefined;
            fullName = formData.get('fullName') as string | undefined || undefined;
            description = formData.get('description') as string | undefined || undefined;

            const file = formData.get('avatar') as File | null;
            if (file && file.size > 0) {
                const blob = await put(`avatars/user_${id}_${Date.now()}.${file.name.split('.').pop()}`, file, {
                    access: 'public',
                });
                avatar = blob.url;
            } else {
                const avatarUrl = formData.get('avatarUrl') as string | null;
                if (avatarUrl) avatar = avatarUrl;
            }
        } else {
            const body = await req.json();
            username = body.username;
            fullName = body.fullName;
            description = body.description;
            avatar = body.avatar;
        }

        const data: any = {};
        if (username !== undefined && username !== null) data.username = (username as string).trim();
        if (fullName !== undefined) data.fullName = (fullName as string)?.trim() || null;
        if (description !== undefined) data.description = (description as string)?.trim() || null;
        if (avatar !== undefined) data.avatar = (avatar as string)?.trim() || null;

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ message: 'Güncellenecek alan yok.' }, { status: 400 });
        }

        if (data.username) {
            const existing = await prisma.user.findFirst({
                where: { username: data.username, NOT: { id: Number(id) } },
            });
            if (existing) {
                return NextResponse.json({ message: 'Bu kullanıcı adı zaten kullanılıyor.' }, { status: 409 });
            }
        }

        const user = await prisma.user.update({
            where: { id: Number(id) },
            data,
            select: { id: true, username: true, fullName: true, description: true, avatar: true },
        });

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
