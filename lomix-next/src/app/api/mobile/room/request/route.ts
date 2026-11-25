import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/current-user';
import { leaveRoomMembership, requestRoomMembership } from '@/lib/room-membership';

/**
 * @swagger
 * /api/mobile/room/request:
 *   post:
 *     summary: Oda üyeliği isteği gönder ya da üyelikten ayrıl
 *     description: |
 *       `requestType: "join"` oda sahibine üyelik isteği gönderir (`room/member-request` ile aynı kurallar). `requestType: "leave"`
 *       kullanıcıyı oda üyeliğinden çıkarır; bekleyen isteği varsa geri çeker. `userId` isteğe bağlıdır, verilirse token sahibiyle
 *       aynı olmalıdır. Başarılı yanıtta mesaj hem `message` hem `data.message` içinde döner.
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, requestType]
 *             properties:
 *               roomId:
 *                 type: string
 *               userId:
 *                 type: string
 *               requestType:
 *                 type: string
 *                 enum: [join, leave]
 *     responses:
 *       200:
 *         description: İşlem tamamlandı (data.message)
 *       400:
 *         description: Geçersiz istek ya da oda sahibi ayrılamaz
 *       403:
 *         description: Başka kullanıcı adına işlem ya da oda aktif değil
 *       404:
 *         description: Oda bulunamadı
 *       409:
 *         description: Zaten üye / zaten bekleyen istek / üye değil
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return NextResponse.json({ status: false, success: false, message: 'Yetkisiz erişim.' }, { status: 401 });

        const body = await request.json().catch(() => null);
        const roomId = body?.roomId;
        const requestType = typeof body?.requestType === 'string' ? body.requestType.toLowerCase() : '';
        if (!roomId) return NextResponse.json({ status: false, success: false, message: 'roomId zorunludur.' }, { status: 400 });
        if (requestType !== 'join' && requestType !== 'leave') {
            return NextResponse.json({ status: false, success: false, message: "requestType 'join' veya 'leave' olmalıdır." }, { status: 400 });
        }
        // İşlem yalnızca token sahibi adına yapılır
        if (body.userId !== undefined && body.userId !== null && body.userId !== '' && Number(body.userId) !== userId) {
            return NextResponse.json({ status: false, success: false, message: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
        }

        const result = requestType === 'join'
            ? await requestRoomMembership(userId, String(roomId))
            : await leaveRoomMembership(userId, String(roomId));

        return NextResponse.json(
            { status: result.ok, success: result.ok, message: result.message, data: { message: result.message } },
            { status: result.status },
        );
    } catch (error: any) {
        console.error('room/request error:', error);
        return NextResponse.json({ status: false, success: false, message: 'Beklenmeyen bir hata oluştu.' }, { status: 500 });
    }
}
