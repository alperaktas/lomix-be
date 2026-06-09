import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/anlar/detail?id=X
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id zorunludur' }, { status: 400 });

    const a = await prisma.an.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, username: true, fullName: true, avatar: true, anBanned: true } },
            tags: { select: { tag: true } },
            _count: { select: { likes: true, comments: true, hiLikes: true } },
        },
    });

    if (!a) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    return NextResponse.json({
        an: {
            id: a.id,
            description: a.description,
            imageUrl: a.imageUrl,
            actionType: a.actionType,
            createdAt: a.createdAt,
            tags: a.tags.map(t => t.tag),
            likeCount: a._count.likes,
            hiLikeCount: a._count.hiLikes,
            commentCount: a._count.comments,
            user: a.user,
        },
    });
}
