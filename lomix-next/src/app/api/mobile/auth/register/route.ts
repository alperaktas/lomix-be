import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendEmail, getEmailTemplate } from '@/lib/email';

/**
 * @swagger
 * /api/mobile/auth/register:
 *   post:
 *     summary: Yeni kullanıcı kaydı
 *     tags: [Mobile Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               gender:
 *                 type: string
 *               deviceModel:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Kayıt başarılı, doğrulama kodu gönderildi
 *       409:
 *         description: Kullanıcı zaten mevcut
 *       400:
 *         description: Geçersiz veri
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, email, password, gender, deviceModel, phone } = body;

        // 1. Zorunlu alan kontrolü
        if (!username || !email || !password) {
            return NextResponse.json({
                error_code: 'VALIDATION_ERROR',
                message: 'Kullanıcı adı, e-posta ve şifre zorunludur.'
            }, { status: 400 });
        }

        // 2. Kullanıcı var mı kontrolü
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }]
            }
        });

        if (existingUser) {
            return NextResponse.json({
                error_code: 'USER_ALREADY_EXISTS',
                message: 'Bu kullanıcı adı veya e-posta zaten kullanımda.'
            }, { status: 409 });
        }

        // 3. Şifreleme ve Kod Üretme
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

        const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        // 4. Kayıt
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                gender,
                deviceModel,
                phone,
                ipAddress,
                userAgent,
                role: 'user',
                status: 'pending',
                verificationCode
            }
        });

        // 5. Email Gönderimi
        const htmlContent = getEmailTemplate('verification', {
            username,
            verificationCode
        });

        // Arka planda gönder (await beklemeyebiliriz ama Next.js serveless function'da beklemek daha güvenlidir)
        await sendEmail(email, 'Lomix - Üyelik Doğrulama', htmlContent);

        return NextResponse.json({
            message: 'Kayıt başarılı. Doğrulama kodu e-posta adresinize gönderildi.',
            userId: newUser.id,
            status: 'pending'
        }, { status: 201 });

    } catch (error: any) {
        const { default: logger } = await import('@/lib/logger');
        logger.error(`Mobil Kayıt Hatası: ${error.message}`, { error });

        return NextResponse.json({
            error_code: 'SERVER_ERROR',
            message: error.message || 'Sunucu hatası'
        }, { status: 500 });
    }
}
