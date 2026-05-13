import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { logRoomEvent } from '@/lib/room-log';

/**
 * @swagger
 * /api/mobile/room/member/invite-respond:
 *   post:
 *     summary: Üyelik davetine yanıt ver
 *     tags: [Mobile Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [inviteId, action]
 *             properties:
 *               inviteId:
 *                 type: integer
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *     responses:
 *       200:
 *         description: Davet yanıtlandı
 *       403:
 *         description: Bu davet size ait değil
 *       404:
 *         description: Davet bulunamadı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const { inviteId, action } = await request.json();
        if (!inviteId || !action) {
            return ApiResponseHelper.error("inviteId ve action zorunludur.", 400);
        }

        if (!['accept', 'reject'].includes(action)) {
            return ApiResponseHelper.error("action 'accept' veya 'reject' olmalıdır.", 400);
        }

        const invite = await prisma.roomMemberInvite.findUnique({
            where: { id: Number(inviteId) },
        });

        if (!invite) return ApiResponseHelper.error("Davet bulunamadı.", 404);
        if (invite.userId !== userId) return ApiResponseHelper.error("Bu davet size ait değil.", 403);
        if (invite.status !== 'pending') {
            return ApiResponseHelper.error("Bu davet zaten yanıtlanmış.", 400);
        }

        if (action === 'accept') {
            const [, userInfo] = await Promise.all([
                prisma.$transaction([
                    prisma.roomMemberInvite.update({
                        where: { id: invite.id },
                        data: { status: 'accepted' },
                    }),
                    prisma.roomMember.upsert({
                        where: { roomId_userId: { roomId: invite.roomId, userId } },
                        create: { roomId: invite.roomId, userId, role: 'member', invitedBy: invite.invitedBy },
                        update: {},
                    }),
                ]),
                prisma.user.findUnique({
                    where: { id: userId },
                    select: { username: true, fullName: true, avatar: true },
                }),
            ]);
            logRoomEvent(invite.roomId, userId, 'MEMBER_JOINED');

            return ApiResponseHelper.success({
                rtm_event: {
                    type: 'MEMBER_JOINED',
                    userId: String(userId),
                    username: userInfo?.fullName || userInfo?.username || '',
                    avatarUrl: userInfo?.avatar || '',
                },
            }, "Daveti kabul ettiniz. Artık oda üyesisiniz.");
        } else {
            await prisma.roomMemberInvite.update({
                where: { id: invite.id },
                data: { status: 'rejected' },
            });
            logRoomEvent(invite.roomId, userId, 'MEMBER_INVITE_REJECTED');
            return ApiResponseHelper.success({
                rtm_event: { type: 'MEMBER_INVITE_REJECTED', userId: String(userId) },
            }, "Davet reddedildi.");
        }
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
