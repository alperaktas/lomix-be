import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

const STATUS_TEXT: Record<string, string> = {
    pending: 'Ajans sahibinin onayı bekleniyor',
    owner_approved: 'Ajans sahibi onayladı, admin onayı bekleniyor',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
};

/**
 * @swagger
 * /api/mobile/agency/my_application:
 *   get:
 *     summary: Kendi ajans başvurularım ve sonuçları
 *     description: |
 *       Token'daki kullanıcının ajanslara yaptığı başvuruları, en yeni en üstte döndürür. Her başvuruda
 *       sonuç (`status`, `status_text`), başvururken girilen bilgiler (tür, iletişim, not, KVKK onay tarihi) ve
 *       gönderilen fotoğraf (`photo_url`) bulunur. Fotoğrafı yalnızca başvuran görür; ajans sahibine
 *       hiçbir uçta dönmez. `status`: `pending` (ajans sahibi bekleniyor), `owner_approved` (admin
 *       bekleniyor), `approved`, `rejected` (`rejected_by`: owner/admin).
 *     tags: [Mobile Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: agency_id
 *         required: false
 *         schema:
 *           type: integer
 *         description: Verilirse yalnızca o ajansa yapılan başvuru döner
 *     responses:
 *       200:
 *         description: data.applications[], data.is_streamer, data.gender_verified
 *       400:
 *         description: Geçersiz agency_id
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

        const agencyParam = new URL(request.url).searchParams.get('agency_id');
        const agencyId = agencyParam === null ? null : Number(agencyParam);
        if (agencyId !== null && (!Number.isInteger(agencyId) || agencyId < 1)) {
            return NextResponse.json({ status: false, message: 'Geçerli bir agency_id gönderilmelidir.' }, { status: 400 });
        }

        const [applications, user] = await Promise.all([
            prisma.agencyApplication.findMany({
                where: { userId, ...(agencyId !== null ? { agencyId } : {}) },
                orderBy: { updatedAt: 'desc' },
                include: { agency: { select: { id: true, name: true, logo: true } } },
            }),
            prisma.user.findUnique({ where: { id: userId }, select: { isBroadcaster: true, genderVerified: true } }),
        ]);

        return NextResponse.json({
            status: true,
            success: true,
            message: applications.length > 0 ? 'Başvurularınız yüklendi' : 'Başvurunuz bulunmuyor',
            data: {
                is_streamer: user?.isBroadcaster ?? false,
                gender_verified: user?.genderVerified ?? false,
                applications: applications.map(a => ({
                    application_id: String(a.id),
                    status: a.status,
                    status_text: STATUS_TEXT[a.status] ?? a.status,
                    rejected_by: a.status === 'rejected' ? a.rejectedBy : null,
                    agency: { id: String(a.agency.id), name: a.agency.name, logo: a.agency.logo },
                    application_type: a.applicationType,
                    contact_method: a.contactMethod,
                    contact_value: a.contactValue,
                    note: a.note,
                    photo_url: a.photoUrl,
                    kvkk_accepted_at: a.kvkkAcceptedAt.toISOString(),
                    owner_approved_at: a.ownerApprovedAt ? a.ownerApprovedAt.toISOString() : null,
                    created_at: a.createdAt.toISOString(),
                    updated_at: a.updatedAt.toISOString(),
                })),
            },
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
