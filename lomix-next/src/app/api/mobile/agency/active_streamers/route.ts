import { NextResponse } from 'next/server';
import { fmtDiamonds, isActiveMember, loadRoster, publisherOf, requireOwnerAgency } from '@/lib/agency-mobile';

/**
 * @swagger
 * /api/mobile/agency/active_streamers:
 *   get:
 *     summary: Toplam aktif yayıncılar listesi
 *     description: |
 *       Bu ay (Türkiye saati) elmas kazanmış yayıncılar, kazancı en yüksek en üstte (`rank`). Yayın süresi
 *       tutulmadığı için `hours` alanında süre yerine bu ayki kazanç metni ("12.500 Elmas") döner; sayısal
 *       değer `diamonds` alanındadır.
 *     tags: [Mobile Agency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: data.title ve data.active_publishers[] (rank, id, full_name, profile_image, profile_url, hours, diamonds, is_verified)
 *       404:
 *         description: Ajans bulunamadı
 */
export async function GET(request: Request) {
    try {
        const owned = await requireOwnerAgency(request);
        if ('error' in owned) return owned.error;

        const active = (await loadRoster(owned.agency.id))
            .filter(isActiveMember)
            .sort((a, b) => b.monthDiamonds - a.monthDiamonds)
            .map((m, i) => ({
                rank: i + 1,
                ...publisherOf(m, request.url),
                hours: fmtDiamonds(m.monthDiamonds),
                diamonds: m.monthDiamonds,
            }));

        return NextResponse.json({
            status: true,
            message: 'Toplam aktif yayıncılar başarıyla getirildi',
            data: { title: 'Toplam Aktif Yayıncı', active_publishers: active },
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
