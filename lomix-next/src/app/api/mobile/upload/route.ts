import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/current-user';
import { uploadChatMedia } from '@/lib/chat-media';

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
 *                 description: Resim (jpeg/png/gif/webp), video (mp4), ses (mp3/m4a/aac/wav/ogg/webm/3gpp) veya pdf.
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

        const uploaded = await uploadChatMedia(file);
        if (!uploaded.ok) {
            return NextResponse.json({ status: false, message: uploaded.message }, { status: 400 });
        }

        return NextResponse.json({
            status: true,
            message: "Dosya başarıyla yüklendi.",
            data: {
                url: uploaded.url,
                name: uploaded.pathname,
                size: file.size,
                type: file.type,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 400 });
    }
}
