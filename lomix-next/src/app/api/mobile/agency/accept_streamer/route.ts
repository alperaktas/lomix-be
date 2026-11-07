import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { agencyRoleGuard } from '@/lib/agency-mobile';
import { createNotification } from '@/lib/notifications';
import { agencyApplyBlock, AGENCY_APPLICANT_NOT_ELIGIBLE } from '@/lib/gender';

/**
 * @swagger
 * /api/mobile/agency/accept_streamer:
 *   get:
 *     summary: Yayıncı başvurusunu ajans sahibi olarak onayla
 *     description: |
 *       `userId` ile belirtilen kullanıcının, token'daki ajans sahibinin ajansına yaptığı bekleyen başvurusunu
 *       onaylar. Onay iki aşamalıdır: bu adımdan sonra başvuru **admin onayına** düşer; kullanıcı admin de
 *       onaylayınca ajansın yayıncı listesine girer. Aynı başvuruyu tekrar onaylamak hata değildir.
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
 *         description: Başvuru onaylandı, admin onayı bekleniyor
 *       403:
 *         description: Ajans sahibi değilsiniz
 *       404:
 *         description: Bu kullanıcının ajansınıza bekleyen başvurusu yok
 *       409:
 *         description: Ajans pasif
 */
export async function GET(request: Request) {
    try {
        const agencyOwnerId = await getCurrentUserId(request);
        if (!agencyOwnerId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }
        const denied = await agencyRoleGuard(agencyOwnerId);
        if (denied) return denied;

        const targetUserId = Number(new URL(request.url).searchParams.get('userId'));
        if (!Number.isInteger(targetUserId) || targetUserId < 1) {
            return NextResponse.json({ status: false, message: "userId parameter is required" }, { status: 400 });
        }

        const agency = await prisma.agency.findUnique({ where: { ownerId: agencyOwnerId } });
        if (!agency) {
            return NextResponse.json({ status: false, message: "Ajans sahibi değilsiniz" }, { status: 403 });
        }
        if (!agency.isActive) {
            return NextResponse.json({ status: false, message: "Ajansınız pasif, başvuru onaylanamaz." }, { status: 409 });
        }

        const application = await prisma.agencyApplication.findUnique({
            where: { userId_agencyId: { userId: targetUserId, agencyId: agency.id } },
            select: { id: true, status: true, user: { select: { gender: true } } },
        });
        if (!application || (application.status !== 'pending' && application.status !== 'owner_approved')) {
            return NextResponse.json({ status: false, message: "Bu kullanıcının ajansınıza bekleyen başvurusu yok" }, { status: 404 });
        }

        // Kural sonradan geldiği için kadın olmayan bir kullanıcının eski başvurusu ilerletilemez (reddedilebilir).
        if (agencyApplyBlock(application.user.gender)) {
            return NextResponse.json({ status: false, message: AGENCY_APPLICANT_NOT_ELIGIBLE }, { status: 409 });
        }

        // Koşul güncellemenin kendi WHERE'inde: eşzamanlı çift onay ya da ret/admin ile yarışta tek işlem kazanır.
        const flipped = await prisma.agencyApplication.updateMany({
            where: { id: application.id, status: 'pending' },
            data: { status: 'owner_approved', ownerApprovedAt: new Date() },
        });

        if (flipped.count === 1) {
            await createNotification({
                audience: 'user',
                targetUserId,
                type: 'agency_application',
                title: 'Başvurunuz ajans tarafından onaylandı',
                body: `${agency.name} ajansı başvurunuzu onayladı. Son adım olarak admin onayı bekleniyor.`,
                data: { application_id: String(application.id), status: 'owner_approved' },
            }).catch(() => {});
        } else if (application.status === 'pending') {
            // Bu arada başka bir işlem (ret) başvuruyu değiştirdi.
            return NextResponse.json({ status: false, message: "Başvuru artık beklemiyor" }, { status: 409 });
        }

        return NextResponse.json({
            status: true,
            success: true,
            message: "Yayıncı onaylandı, admin onayı bekleniyor.",
            data: {},
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
