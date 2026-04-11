import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const search = searchParams.get('search') || '';

        const skip = (page - 1) * limit;

        const where = search ? {
            OR: [
                { action: { contains: search, mode: 'insensitive' as const } },
                { ipAddress: { contains: search, mode: 'insensitive' as const } },
                {
                    user: {
                        OR: [
                            { username: { contains: search, mode: 'insensitive' as const } },
                            { email: { contains: search, mode: 'insensitive' as const } }
                        ]
                    }
                }
            ]
        } : {};

        const [logs, total] = await Promise.all([
            prisma.userLog.findMany({
                where,
                take: limit,
                skip: skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { username: true, email: true }
                    }
                }
            }),
            prisma.userLog.count({ where })
        ]);

        return ApiResponseHelper.success(logs, "Loglar başarıyla getirildi.", 200, {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit)
        });
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
