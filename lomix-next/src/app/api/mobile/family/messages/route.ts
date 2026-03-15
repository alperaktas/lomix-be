import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const messages = await prisma.familyMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                sender: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        avatar: true
                    }
                }
            }
        });

        return NextResponse.json({
            status: true,
            data: messages.map(msg => ({
                message_id: String(msg.id),
                sender_id: String(msg.senderId),
                sender_name: msg.sender.fullName || msg.sender.username,
                sender_avatar: msg.sender.avatar || "/img/avatars/default.png",
                content: msg.messageText,
                created_at: msg.createdAt.toISOString()
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const content = body.content || body.message_text;

        if (!content) {
            return NextResponse.json({ status: false, message: "Content is required" }, { status: 400 });
        }

        const newMessage = await prisma.familyMessage.create({
            data: {
                senderId: userId,
                messageText: content
            }
        });

        return NextResponse.json({
            status: true,
            message: "Mesaj gönderildi",
            data: newMessage
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
