import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/families/messages:
 *   post:
 *     summary: Aile grubuna toplu mesaj gönderir.
 *     tags: [Mobile Family]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message_text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mesaj başarıyla gönderildi
 *       400:
 *         description: Hatalı istek
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);

        if (!userId) {
            return NextResponse.json({ message: "Yetkisiz erişim" }, { status: 401 });
        }

        const body = await request.json();
        const { message_text } = body;

        if (!message_text) {
            return NextResponse.json({
                success: false,
                message: "Mesaj metni eksik.",
                data: null,
                error_code: "FAMILY_MESSAGING_DISABLED",
                meta: null
            }, { status: 400 });
        }

        // Veritabanına kaydet
        const familyMsg = await prisma.familyMessage.create({
            data: {
                senderId: userId,
                messageText: message_text
            }
        });

        return NextResponse.json({
            success: true,
            message: "Mesaj gönderildi."
        });
    } catch (error) {
        return NextResponse.json({ success: false, message: "İstek işlenemedi." }, { status: 400 });
    }
}
