import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/profile/avatar/set-active:
 *   post:
 *     summary: Kullanıcının aktif avatarını belirler
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - photo_id
 *             properties:
 *               photo_id:
 *                 type: integer
 *                 description: Aktif yapılacak fotoğrafın ID'si (UserPhoto)
 *     responses:
 *       200:
 *         description: Aktif avatar başarıyla güncellendi
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Fotoğraf bulunamadı
 */
export async function POST(request: Request) {
    const { default: logger } = await import('@/lib/logger');
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            logger.warn('Aktif avatar belirleme: Yetkisiz erişim', { ip: ipAddress });
            return NextResponse.json({ status: false, message: "Yetkisiz erişim." }, { status: 401 });
        }

        let body: { photo_id?: number };
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ status: false, message: "Geçersiz JSON formatı." }, { status: 400 });
        }

        const { photo_id } = body;

        if (!photo_id || typeof photo_id !== 'number') {
            return NextResponse.json({ status: false, message: "photo_id (sayı) gereklidir." }, { status: 400 });
        }

        logger.debug('Aktif avatar belirleme isteği', { userId, photoId: photo_id });

        // Fotoğrafın kullanıcıya ait olduğunu kontrol et
        const photo = await prisma.userPhoto.findFirst({
            where: { id: photo_id, userId },
        });

        if (!photo) {
            logger.warn('Aktif avatar: Fotoğraf bulunamadı', { userId, photoId: photo_id });
            return NextResponse.json({ status: false, message: "Fotoğraf bulunamadı." }, { status: 404 });
        }

        // Tüm aktif avatar history kayıtlarını pasif yap
        await prisma.userAvatarHistory.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
        });

        // Yeni avatar history kaydı oluştur (aktif olarak)
        await prisma.userAvatarHistory.create({
            data: {
                userId,
                imageUrl: photo.url,
                isActive: true,
            },
        });

        // Kullanıcının ana avatar alanını da güncelle
        await prisma.user.update({
            where: { id: userId },
            data: { avatar: photo.url },
        });

        logger.info(`Aktif avatar güncellendi: photo_id=${photo_id}, url=${photo.url}`, { userId });

        return NextResponse.json({
            status: true,
            message: "Aktif avatar başarıyla güncellendi.",
            data: {
                photo_id: photo.id,
                url: photo.url,
            },
        });
    } catch (error: any) {
        const { default: logger } = await import('@/lib/logger');
        logger.error(`Aktif avatar belirleme hatası: ${error.message}`, { error });
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
