import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * @swagger
 * /api/mobile/auth/login:
 *   post:
 *     summary: Mobil kullanıcı girişi
 *     tags: [Mobile Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@example.com
 *               password:
 *                 type: string
 *                 example: Sifre123!
 *               deviceInfo:
 *                 type: string
 *                 example: iPhone 15
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *       401:
 *         description: Hatalı bilgiler
 *       400:
 *         description: Eksik bilgi
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, deviceInfo } = body;
        const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

        if (!email || !password) {
            return ApiResponseHelper.error('Lütfen email ve şifre giriniz.', 400);
        }

        const user = await prisma.user.findFirst({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return ApiResponseHelper.error('Email adresi veya şifre hatalı.', 401);
        }

        // Ban kontrolü
        const { checkUserBanStatus } = await import('@/lib/ban-check');
        const banStatus = await checkUserBanStatus(user.id);
        if (banStatus.banned) {
            return ApiResponseHelper.error(banStatus.message || 'Hesabınız askıya alınmıştır.', 403);
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'gizli_anahtar',
            { expiresIn: '30d' }
        );

        // User Log
        await prisma.userLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN_MOBILE',
                ipAddress: ipAddress,
                userAgent: deviceInfo || req.headers.get('user-agent') || 'Unknown Mobile'
            }
        });

        // System Log
        const { default: logger } = await import('@/lib/logger');
        logger.info(`Mobil Giriş: ${user.email}`, { userId: user.id, ip: ipAddress, device: deviceInfo });

        return ApiResponseHelper.success({
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        }, 'Giriş başarılı.');

    } catch (error: any) {
        const { default: logger } = await import('@/lib/logger');
        logger.error(`Mobil Login Hatası: ${error.message}`, { error });

        return ApiResponseHelper.error(error.message, 500);
    }
}
