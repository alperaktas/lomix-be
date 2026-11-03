import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { GENDER_VALUES, chosenGender, isGenderLocked } from '@/lib/gender';

/**
 * @swagger
 * /api/mobile/profile/update:
 *   post:
 *     summary: Profili Güncelle
 *     tags: [Mobile Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               full_name:
 *                 type: string
 *               bio:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: |
 *                   Yalnızca henüz cinsiyet seçilmemişse yazılır. Bir kez seçildikten sonra farklı bir değer
 *                   gönderilirse 403 ve `error_code: GENDER_LOCKED` döner (aynı değer ya da boş değer sorun değildir).
 *               country:
 *                 type: string
 *               birthday:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Profil Güncellendi (data.gender_locked, cinsiyet kilitliyse true)
 *       400:
 *         description: Geçersiz cinsiyet değeri ya da güncellenecek alan yok
 *       403:
 *         description: Cinsiyet daha önce seçilmiş, değiştirilemez (GENDER_LOCKED)
 */
export async function POST(request: Request) {
    const { default: logger } = await import('@/lib/logger');
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Yetkisiz erişim." }, { status: 401 });
        }

        let body: Record<string, any> = {};
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            body = await request.json();
        } else {
            const formData = await request.formData();
            formData.forEach((value, key) => { body[key] = value; });
        }

        logger.debug('Profil güncelleme isteği', { ip: ipAddress, userAgent, body });

        // Güncellenebilir alanlar
        const updateData: Record<string, any> = {};

        if (body.username !== undefined) updateData.username = body.username;
        if (body.full_name !== undefined) updateData.fullName = body.full_name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.bio !== undefined) updateData.description = body.bio;
        // Cinsiyet bir kez seçildikten sonra değiştirilemez; seçili değerin aynısı ya da boş değer sorun değil.
        const requestedGender = typeof body.gender === 'string' ? body.gender.trim().toLowerCase() : '';
        if (requestedGender) {
            if (!(GENDER_VALUES as readonly string[]).includes(requestedGender)) {
                return NextResponse.json({ status: false, message: "Cinsiyet male, female veya other olmalıdır." }, { status: 400 });
            }
            const current = await prisma.user.findUnique({ where: { id: userId }, select: { gender: true } });
            const chosen = chosenGender(current?.gender);
            if (chosen && chosen !== requestedGender) {
                return NextResponse.json({
                    status: false,
                    message: "Cinsiyet seçildikten sonra değiştirilemez.",
                    data: { error_code: 'GENDER_LOCKED' },
                }, { status: 403 });
            }
            updateData.gender = requestedGender;
        }
        if (body.country !== undefined) updateData.country = body.country;
        if (body.avatar !== undefined) updateData.avatar = body.avatar;
        if (body.profileImage !== undefined) updateData.avatar = body.profileImage;
        if (body.phone !== undefined) updateData.phone = body.phone;

        // Doğum tarihi: birthday, birth_date veya birthDate olarak gelebilir
        const birthValue = body.birthday ?? body.birth_date ?? body.birthDate;
        if (birthValue !== undefined && birthValue !== null && birthValue !== '') {
            updateData.birthDate = new Date(birthValue);
        } else if (birthValue === '' || birthValue === null) {
            updateData.birthDate = null;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ status: false, message: "Güncellenecek alan bulunamadı." }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        logger.info(`Profil güncellendi: ${updatedUser.username}`, { userId, fields: Object.keys(updateData) });

        return NextResponse.json({
            status: true,
            message: "Profil başarıyla güncellendi.",
            data: {
                username: updatedUser.username,
                full_name: updatedUser.fullName || '',
                description: updatedUser.description || '',
                gender: updatedUser.gender || '',
                gender_locked: isGenderLocked(updatedUser.gender),
                country: updatedUser.country || '',
                avatar: updatedUser.avatar || '',
                phone: updatedUser.phone || '',
                birth_date: updatedUser.birthDate ? updatedUser.birthDate.toISOString().split('T')[0] : null,
            }
        });
    } catch (error: any) {
        logger.error(`Profil güncelleme hatası: ${error.message}`, { ip: ipAddress, error });

        return NextResponse.json({ status: false, message: "Profil güncellenemedi." }, { status: 400 });
    }
}
