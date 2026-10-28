import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { createNotification } from '@/lib/notifications';

/**
 * @swagger
 * /api/mobile/ajans/yayici_reddet:
 *   get:
 *     summary: Yayıncı başvurusunu ajans sahibi olarak reddet
 *     description: |
 *       `userId` ile belirtilen kullanıcının, token'daki ajans sahibinin ajansına yaptığı henüz admine
 *       geçmemiş (`pending`) başvurusunu reddeder; kullanıcıya bildirim gider ve isterse yeniden başvurabilir.
 *       Ajans sahibi onaylamış, admin onayı bekleyen başvuruyu artık reddedemez.
 *     tags: [Mobile Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Başvuru reddedildi
 *       403:
 *         description: Ajans sahibi değilsiniz
 *       404:
 *         description: Bu kullanıcının ajansınıza bekleyen başvurusu yok
 */
export async function GET(request: Request) {
    try {
        const agencyOwnerId = await getCurrentUserId(request);
        if (!agencyOwnerId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const targetUserId = Number(new URL(request.url).searchParams.get('userId'));
        if (!Number.isInteger(targetUserId) || targetUserId < 1) {
            return NextResponse.json({ status: false, message: "userId parameter is required" }, { status: 400 });
        }

        const agency = await prisma.agency.findUnique({ where: { ownerId: agencyOwnerId } });
        if (!agency) {
            return NextResponse.json({ status: false, message: "Ajans sahibi değilsiniz" }, { status: 403 });
        }

        const application = await prisma.agencyApplication.findUnique({
            where: { userId_agencyId: { userId: targetUserId, agencyId: agency.id } },
            select: { id: true },
        });
        if (!application) {
            return NextResponse.json({ status: false, message: "Bu kullanıcının ajansınıza bekleyen başvurusu yok" }, { status: 404 });
        }

        const flipped = await prisma.agencyApplication.updateMany({
            where: { id: application.id, status: 'pending' },
            data: { status: 'rejected', rejectedBy: 'owner' },
        });
        if (flipped.count === 0) {
            return NextResponse.json({ status: false, message: "Başvuru artık beklemiyor" }, { status: 404 });
        }

        await createNotification({
            audience: 'user',
            targetUserId,
            type: 'agency_application',
            title: 'Ajans başvurunuz reddedildi',
            body: `${agency.name} ajansına yaptığınız başvuru kabul edilmedi.`,
            data: { application_id: String(application.id), status: 'rejected' },
        }).catch(() => {});

        return NextResponse.json({ status: true, success: true, message: "Başvuru reddedildi.", data: {} });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
