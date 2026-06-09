import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/anlar - tüm anları listele (admin), ?topic_id=X veya ?user_id=X ile filtrele
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (searchParams.get('topic_id')) where.topicId = Number(searchParams.get('topic_id'));
    if (searchParams.get('user_id')) where.userId = Number(searchParams.get('user_id'));

    const [anlar, total] = await Promise.all([
        prisma.an.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, username: true, fullName: true, avatar: true, anBanned: true } },
                tags: { select: { tag: true } },
                _count: { select: { likes: true, comments: true, hiLikes: true } },
            },
        }),
        prisma.an.count({ where }),
    ]);

    return NextResponse.json({
        anlar: anlar.map(a => ({
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
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
    });
}

// PUT /api/anlar - an düzenle (admin)
export async function PUT(request: Request) {
    try {
        const { id, description, tags, imageUrl } = await request.json();
        if (!id) return NextResponse.json({ error: 'id zorunludur' }, { status: 400 });

        const data: any = {};
        if (description !== undefined) data.description = description?.trim() || null;
        if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null;

        if (Object.keys(data).length > 0) {
            await prisma.an.update({ where: { id: Number(id) }, data });
        }

        if (Array.isArray(tags)) {
            await prisma.anTag.deleteMany({ where: { anId: Number(id) } });
            if (tags.length > 0) {
                await prisma.anTag.createMany({ data: tags.map((tag: string) => ({ anId: Number(id), tag })) });
            }
        }

        return NextResponse.json({ success: true, message: 'An güncellendi.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/anlar?id=X - an sil (admin)
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id zorunludur' }, { status: 400 });

    await prisma.an.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'An silindi.' });
}
