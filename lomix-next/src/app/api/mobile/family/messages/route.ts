import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/family/messages:
 *   get:
 *     summary: Aile / Ortak Mesajlar
 *     tags: [Mobile Family]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mesaj Geçmişi Listesi
 */
export async function GET() {
    return NextResponse.json({
        status: true,
        data: [
            {
                message_id: "m_001",
                sender_id: "u_101",
                content: "Merhaba aile!",
                created_at: "2024-05-12T10:00:00Z"
            }
        ]
    });
}
