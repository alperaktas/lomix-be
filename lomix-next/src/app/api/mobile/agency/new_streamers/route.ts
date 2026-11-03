import { NextResponse } from 'next/server';
import { isNewMember, loadRoster, publisherOf, requireOwnerAgency } from '@/lib/agency-mobile';

/**
 * @swagger
 * /api/mobile/agency/new_streamers:
 *   get:
 *     summary: Yeni yayıncılar listesi
 *     description: Ajans sahibinin ajansına son 7 gün içinde katılan yayıncılar, en yeni en üstte.
 *     tags: [Mobile Agency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: data.title ve data.publishers[] (id, full_name, profile_image, profile_url, is_verified)
 *       404:
 *         description: Ajans bulunamadı
 */
export async function GET(request: Request) {
    try {
        const owned = await requireOwnerAgency(request);
        if ('error' in owned) return owned.error;

        const now = new Date();
        const publishers = (await loadRoster(owned.agency.id, now))
            .filter(m => isNewMember(m, now))
            .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
            .map(m => publisherOf(m, request.url));

        return NextResponse.json({
            status: true,
            message: 'Yeni yayıncılar başarıyla getirildi',
            data: { title: 'Yeni Yayıncılar', publishers },
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
