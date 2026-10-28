import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/ajans/yayici_onay:
 *   get:
 *     summary: Ajans sahibinin onayını bekleyen yayıncı başvuruları
 *     description: |
 *       Kullanıcıların `profile/ajans_katil` ile yaptığı başvurulardan, ajans sahibinin henüz onaylamadığı
 *       (`pending`) olanları listeler. Onay iki aşamalıdır: ajans sahibi (`yayici_onayla`), sonra admin.
 *       Başvuranın iletişim bilgisi (telefon/e-posta) ajans sahibine gösterilmez.
 *     tags: [Mobile Agency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Yayıncı onay listesi yüklendi
 *       404:
 *         description: Ajans bulunamadı
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const agency = await prisma.agency.findUnique({
            where: { ownerId: userId },
            select: { id: true, name: true },
        });
        if (!agency) {
            return NextResponse.json({ status: false, message: "Ajans bulunamadı" }, { status: 404 });
        }

        const applications = await prisma.agencyApplication.findMany({
            where: { agencyId: agency.id, status: 'pending' },
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { id: true, fullName: true, username: true, avatar: true } } },
        });

        return NextResponse.json({
            status: true,
            success: true,
            message: "Yayıncı onay listesi yüklendi",
            data: {
                publisher_id: String(userId),
                publisher_name: agency.name,
                followers: applications.map(a => ({
                    user_id: String(a.user.id),
                    name: a.user.fullName || a.user.username,
                    profile_picture_url: a.user.avatar || `https://i.pravatar.cc/150?u=${a.user.id}`,
                    application_id: String(a.id),
                    application_type: a.applicationType,
                    note: a.note,
                    created_at: a.createdAt.toISOString(),
                })),
            },
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
