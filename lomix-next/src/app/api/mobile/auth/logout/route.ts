import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

/**
 * @swagger
 * /api/mobile/auth/logout:
 *   post:
 *     summary: Mobil oturumu kapat
 *     tags: [Mobile Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Oturum kapatıldı
 */
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar'); // Mobil secret farklı olabilir

                await prisma.userLog.create({
                    data: {
                        userId: decoded.id,
                        action: 'MOBILE_LOGOUT',
                        ipAddress: req.headers.get('x-forwarded-for'),
                        userAgent: req.headers.get('user-agent')
                    }
                });
            } catch (e) { }
        }
        return ApiResponseHelper.success({}, 'Mobil oturum sonlandırıldı');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
