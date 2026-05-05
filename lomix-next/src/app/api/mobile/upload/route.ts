import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getCurrentUserId } from '@/lib/current-user';

/**
 * @swagger
 * /api/mobile/upload:
 *   post:
 *     summary: Medya Yükleme (Genel)
 *     tags: [Mobile Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Dosya başarıyla yüklendi
 *       400:
 *         description: Dosya bulunamadı veya geçersiz
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Yetkisiz erişim." }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file || typeof file === 'string') {
            return NextResponse.json({ status: false, message: "Dosya bulunamadı." }, { status: 400 });
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ status: false, message: "Desteklenmeyen dosya türü." }, { status: 400 });
        }

        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            return NextResponse.json({ status: false, message: "Dosya boyutu 50MB'ı aşamaz." }, { status: 400 });
        }

        const blob = await put(file.name, file, {
            access: 'public',
            addRandomSuffix: true,
        });

        return NextResponse.json({
            status: true,
            message: "Dosya başarıyla yüklendi.",
            data: {
                url: blob.url,
                name: blob.pathname,
                size: file.size,
                type: file.type,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 400 });
    }
}
