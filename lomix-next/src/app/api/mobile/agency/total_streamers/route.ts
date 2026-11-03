import { NextResponse } from 'next/server';
import { loadRoster, publisherOf, requireOwnerAgency } from '@/lib/agency-mobile';

/**
 * @swagger
 * /api/mobile/agency/total_streamers:
 *   get:
 *     summary: Toplam yayıncılar listesi
 *     description: Ajansın şu an onaylı tüm yayıncıları (admin onayı bekleyenler dahil değildir), en yeni katılan en üstte.
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

        const publishers = (await loadRoster(owned.agency.id))
            .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
            .map(m => publisherOf(m, request.url));

        return NextResponse.json({
            status: true,
            message: 'Toplam yayıncılar başarıyla getirildi',
            data: { title: 'Ajans Toplam Yayıncı', publishers },
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
