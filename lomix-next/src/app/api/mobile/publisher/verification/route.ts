import { getCurrentUserId } from '@/lib/current-user';
import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

type VerifyStatus = 'completed' | 'not_completed' | 'not_approved';

const BENEFITS = [
    { title: 'Cinsiyet Onayı', description: 'Cinsiyet Rozeti Kazanırsınız.', icon: 'shield' },
    { title: 'Fotoğraf Doğrulaması', description: 'Onay Rozeti Kazanırsınız.', icon: 'verified_user' },
    { title: 'Daha Fazla Görünürlük', description: 'Kullanıcıların daha çok dikkatini çekersiniz.', icon: 'hub' },
];

/**
 * @swagger
 * /api/mobile/publisher/verification:
 *   get:
 *     summary: Doğrulama merkezi (onay merkezi) ekranı verileri
 *     description: |
 *       Kullanıcı JWT'den tanınır (yayıncı olması gerekmez). `verifications.gender|photo|phone.status`:
 *       `completed`, `not_completed` (henüz yapılmadı ya da incelemede), `not_approved` (reddedildi).
 *       Cinsiyet ve fotoğraf doğrulaması tek süreçtir (ajans başvurusundaki selfie): admin onayı verilince ikisi birlikte
 *       `completed` olur, başvuru reddedilmişse ikisi `not_approved`. Telefon doğrulaması (SMS) henüz yoktur,
 *       `phone` şimdilik her zaman `not_completed` döner. `benefits` sabit avantaj listesidir.
 *     tags: [Mobile Publisher]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: data.verifications, data.benefits
 *       401:
 *         description: Token geçersiz
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 401);

        const [user, latest] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { genderVerified: true } }),
            prisma.agencyApplication.findFirst({
                where: { userId },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                select: { status: true },
            }),
        ]);
        if (!user) return ApiResponseHelper.error('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 401);

        // Cinsiyet + fotoğraf tek süreç: onaylandıysa ikisi tamam, son başvuru reddedildiyse ikisi onaylanmadı.
        const identity: VerifyStatus = user.genderVerified
            ? 'completed'
            : latest?.status === 'rejected' ? 'not_approved' : 'not_completed';

        return ApiResponseHelper.success({
            verifications: {
                gender: { status: identity, title: 'Cinsiyet Doğrulaması', action_route: '/verification/gender' },
                photo: { status: identity, title: 'Fotoğraf Doğrulaması', action_route: '/verification/photo' },
                // SMS doğrulaması henüz yok (sağlayıcı belli değil)
                phone: { status: 'not_completed' as VerifyStatus, title: 'Telefon Doğrulaması', action_route: '/verification/phone' },
            },
            benefits: BENEFITS,
        }, 'Doğrulama merkezi verileri başarıyla getirildi.');
    } catch (error: any) {
        console.error('publisher/verification error:', error);
        return ApiResponseHelper.error('Doğrulama bilgileri alınırken bir sunucu hatası oluştu.', 500);
    }
}
