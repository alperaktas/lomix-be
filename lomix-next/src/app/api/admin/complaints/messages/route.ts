import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { createNotification } from '@/lib/notifications';
import { THREAD_LIMIT, buildThread, parseMessageBody } from '@/lib/complaint-thread';

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const OWNER_SELECT = { id: true, username: true, fullName: true, avatar: true } as const;

/** Bir talebin tüm konuşması: ilk kayıt talebin kendisi, ardından kullanıcı ve destek mesajları. */
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();

    const complaintId = Number(new URL(request.url).searchParams.get('complaintId'));
    if (!Number.isInteger(complaintId) || complaintId < 1) {
        return NextResponse.json({ error: 'complaintId zorunludur.' }, { status: 400 });
    }

    const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
        include: { user: { select: OWNER_SELECT } },
    });
    if (!complaint) return NextResponse.json({ error: 'Talep bulunamadı.' }, { status: 404 });

    const recent = await prisma.complaintMessage.findMany({
        where: { complaintId },
        orderBy: { createdAt: 'desc' },
        take: THREAD_LIMIT,
    });

    return NextResponse.json({
        complaint: {
            id: complaint.id,
            category: complaint.category,
            status: complaint.status,
            user: complaint.user,
        },
        messages: buildThread(complaint, complaint.user, recent.reverse()),
    });
}

/** Destek ekibi cevabı: kullanıcının talep detayındaki konuşmaya düşer ve kullanıcıya bildirim gider. */
export async function POST(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) return forbidden();

    try {
        const body = await request.json().catch(() => null);
        const complaintId = Number(body?.complaintId);
        if (!Number.isInteger(complaintId) || complaintId < 1) {
            return NextResponse.json({ error: 'complaintId zorunludur.' }, { status: 400 });
        }

        const parsed = parseMessageBody({ content: body?.content, image_urls: body?.imageUrls });
        if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

        const complaint = await prisma.complaint.findUnique({
            where: { id: complaintId },
            select: { id: true, userId: true, category: true },
        });
        if (!complaint) return NextResponse.json({ error: 'Talep bulunamadı.' }, { status: 404 });

        const message = await prisma.complaintMessage.create({
            data: {
                complaintId,
                senderType: 'support',
                senderId: admin.adminId,
                content: parsed.content,
                imageUrls: parsed.imageUrls,
            },
        });

        await createNotification({
            audience: 'user',
            targetUserId: complaint.userId,
            type: 'complaint_reply',
            title: 'Destek ekibinden yanıt var',
            body: `"${complaint.category}" talebinize yanıt verildi.`,
            data: { complaint_id: String(complaint.id) },
        }).catch(() => {});

        return NextResponse.json({ message: { id: message.id, createdAt: message.createdAt } });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
