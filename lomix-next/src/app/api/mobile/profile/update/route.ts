import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

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
 *               description:
 *                 type: string
 *               birth_date:
 *                 type: string
 *                 example: "2000-01-21"
 *               gender:
 *                 type: string
 *               country:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profil Güncellendi
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: 'Yetkisiz erişim.' }, { status: 401 });
        }

        const formData = await request.formData();

        const username   = formData.get('username') as string | null;
        const full_name  = formData.get('full_name') as string | null;
        const description = formData.get('description') as string | null;
        const birth_date = formData.get('birth_date') as string | null;
        const gender     = formData.get('gender') as string | null;
        const country    = formData.get('country') as string | null;

        if (username) {
            const existing = await prisma.user.findFirst({
                where: { username, NOT: { id: userId } },
            });
            if (existing) {
                return NextResponse.json({ status: false, message: 'Bu kullanıcı adı zaten kullanımda.' }, { status: 409 });
            }
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(username    && { username }),
                ...(full_name   !== null && { fullName: full_name }),
                ...(description !== null && { description }),
                ...(birth_date  !== null && { birthDate: birth_date ? new Date(birth_date) : null }),
                ...(gender      && { gender }),
                ...(country     !== null && { country }),
            },
            select: {
                id: true, username: true, fullName: true, description: true,
                birthDate: true, gender: true, country: true, avatar: true,
            },
        });

        return NextResponse.json({
            status: true,
            message: 'Profil başarıyla güncellendi.',
            data: {
                id: String(updated.id),
                username: updated.username,
                full_name: updated.fullName || '',
                description: updated.description || '',
                birth_date: updated.birthDate ? updated.birthDate.toISOString().split('T')[0] : null,
                gender: updated.gender || 'unknown',
                country: updated.country || '',
                avatar_url: updated.avatar || '',
            },
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message || 'Profil güncellenemedi.' }, { status: 500 });
    }
}
