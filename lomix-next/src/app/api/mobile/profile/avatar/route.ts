import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { put, del } from '@vercel/blob';

const MAX_PHOTOS = 4;

/**
 * @swagger
 * /api/mobile/profile/avatar:
 *   post:
 *     summary: Profil fotoğrafı yükle (en fazla 4)
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Fotoğraf yüklendi
 *       400:
 *         description: Limit aşıldı veya dosya yok
 *       401:
 *         description: Yetkisiz erişim
 *
 *   get:
 *     summary: Kullanıcının profil fotoğraflarını listele
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fotoğraf listesi
 *
 *   delete:
 *     summary: Profil fotoğrafı sil
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: photoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fotoğraf silindi
 */
export async function POST(request: Request) {
    const { default: logger } = await import('@/lib/logger');
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            logger.warn('Avatar yükleme: Yetkisiz erişim', { ip: ipAddress });
            return NextResponse.json({ status: false, message: "Yetkisiz erişim." }, { status: 401 });
        }

        logger.debug('Avatar yükleme isteği', { userId, ip: ipAddress, userAgent });

        // Fotoğraf sayısını kontrol et
        const count = await prisma.userPhoto.count({ where: { userId } });
        logger.debug(`Mevcut fotoğraf sayısı: ${count}/${MAX_PHOTOS}`, { userId });

        if (count >= MAX_PHOTOS) {
            logger.warn('Avatar limiti aşıldı', { userId, count });
            return NextResponse.json({
                status: false,
                message: `En fazla ${MAX_PHOTOS} fotoğraf yükleyebilirsiniz.`
            }, { status: 400 });
        }

        const formData = await request.formData();
        const file = formData.get('avatar') as File | null;

        if (!file || file.size === 0) {
            logger.warn('Avatar yükleme: Dosya seçilmedi', { userId });
            return NextResponse.json({ status: false, message: "Dosya seçilmedi." }, { status: 400 });
        }

        logger.debug(`Dosya bilgisi: ${file.name}, ${(file.size / 1024).toFixed(1)}KB, ${file.type}`, { userId });

        // Dosya türü kontrolü (MIME + uzantı)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        const isValidMime = allowedTypes.includes(file.type);
        const isValidExt = allowedExts.includes(ext);

        if (!isValidMime && !isValidExt) {
            logger.warn('Avatar: Geçersiz dosya türü', { userId, type: file.type, ext });
            return NextResponse.json({ status: false, message: "Sadece JPEG, PNG, GIF veya WebP dosyaları kabul edilir." }, { status: 400 });
        }

        // Maksimum 5MB
        if (file.size > 5 * 1024 * 1024) {
            logger.warn('Avatar: Dosya boyutu çok büyük', { userId, size: file.size });
            return NextResponse.json({ status: false, message: "Dosya boyutu 5MB'dan büyük olamaz." }, { status: 400 });
        }

        const blob = await put(`user-photos/user_${userId}_${Date.now()}.${ext}`, file, { access: 'public' });
        const fileUrl = blob.url;

        const photo = await prisma.userPhoto.create({
            data: { userId, url: fileUrl, order: count },
            select: { id: true, url: true, order: true, createdAt: true },
        });

        logger.info(`Avatar yüklendi: ${fileUrl}`, { userId, photoId: photo.id, order: photo.order });

        return NextResponse.json({
            status: true,
            message: "Fotoğraf başarıyla yüklendi.",
            data: photo,
        });
    } catch (error: any) {
        const { default: logger } = await import('@/lib/logger');
        logger.error(`Avatar yükleme hatası: ${error.message}`, { error });
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Yetkisiz erişim." }, { status: 401 });
        }

        const photos = await prisma.userPhoto.findMany({
            where: { userId },
            orderBy: { order: 'asc' },
            select: { id: true, url: true, order: true, createdAt: true },
        });

        return NextResponse.json({
            status: true,
            message: "Fotoğraflar başarıyla getirildi.",
            data: { photos, count: photos.length, max: MAX_PHOTOS },
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Yetkisiz erişim." }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const photoId = Number(searchParams.get('photoId'));

        if (!photoId) {
            return NextResponse.json({ status: false, message: "photoId parametresi gerekli." }, { status: 400 });
        }

        const photo = await prisma.userPhoto.findFirst({
            where: { id: photoId, userId },
        });

        if (!photo) {
            return NextResponse.json({ status: false, message: "Fotoğraf bulunamadı." }, { status: 404 });
        }

        await prisma.userPhoto.delete({ where: { id: photoId } });

        try { await del(photo.url); } catch { }

        return NextResponse.json({ status: true, message: "Fotoğraf silindi." });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
