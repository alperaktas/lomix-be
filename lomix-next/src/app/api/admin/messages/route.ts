import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/admin/messages?user_id=X&other_id=Y&page=1
// user_id varsa o kullanıcının tüm konuşmaları; her ikisi varsa aralarındaki mesajlar
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId   = searchParams.get('user_id')  ? Number(searchParams.get('user_id'))  : undefined;
    const otherId  = searchParams.get('other_id') ? Number(searchParams.get('other_id')) : undefined;
    const page     = Math.max(1, Number(searchParams.get('page') || 1));
    const limit    = 50;
    const skip     = (page - 1) * limit;

    // İki kullanıcı verilmişse → mesaj geçmişi
    if (userId && otherId) {
        const [messages, total] = await Promise.all([
            prisma.directMessage.findMany({
                where: {
                    OR: [
                        { fromId: userId, toId: otherId },
                        { fromId: otherId, toId: userId },
                    ],
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    from: { select: { id: true, username: true, fullName: true, avatar: true } },
                    to:   { select: { id: true, username: true, fullName: true, avatar: true } },
                },
            }),
            prisma.directMessage.count({
                where: {
                    OR: [
                        { fromId: userId, toId: otherId },
                        { fromId: otherId, toId: userId },
                    ],
                },
            }),
        ]);

        return NextResponse.json({
            mode: 'messages',
            messages: messages.map(m => ({
                id: m.id,
                text: m.text,
                imageUrl: m.imageUrl,
                isRead: m.isRead,
                createdAt: m.createdAt,
                from: m.from,
                to: m.to,
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    }

    // Sadece user_id → konuşma listesi
    if (userId) {
        const conversations = await prisma.directMessage.groupBy({
            by: ['fromId', 'toId'],
            where: { OR: [{ fromId: userId }, { toId: userId }] },
            _count: { id: true },
            _max: { createdAt: true },
        });

        // Benzersiz karşı tarafları bul
        const otherIds = [...new Set(conversations.map(c => c.fromId === userId ? c.toId : c.fromId))];
        const users = await prisma.user.findMany({
            where: { id: { in: otherIds } },
            select: { id: true, username: true, fullName: true, avatar: true },
        });
        const userMap = new Map(users.map(u => [u.id, u]));

        return NextResponse.json({
            mode: 'conversations',
            conversations: otherIds.map(oid => ({
                otherUser: userMap.get(oid),
                messageCount: conversations.filter(c => c.fromId === oid || c.toId === oid).reduce((s, c) => s + c._count.id, 0),
                lastAt: conversations.filter(c => c.fromId === oid || c.toId === oid).reduce((m, c) => c._max.createdAt! > m ? c._max.createdAt! : m, new Date(0)),
            })).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()),
        });
    }

    // Hiç filtre yok → son mesajlaşmalar genel liste
    const recent = await prisma.directMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        distinct: ['fromId', 'toId'],
        include: {
            from: { select: { id: true, username: true, fullName: true, avatar: true } },
            to:   { select: { id: true, username: true, fullName: true, avatar: true } },
        },
    });

    return NextResponse.json({
        mode: 'recent',
        messages: recent.map(m => ({
            id: m.id,
            text: m.text,
            imageUrl: m.imageUrl,
            createdAt: m.createdAt,
            from: m.from,
            to: m.to,
        })),
    });
}

// DELETE /api/admin/messages?id=X — tek mesaj sil
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id zorunludur' }, { status: 400 });
    await prisma.directMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
