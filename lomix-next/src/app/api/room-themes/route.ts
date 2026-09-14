import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';

function normalizeColors(input: unknown): number[] | null {
    if (!Array.isArray(input)) return null;
    const colors = input.map((c) => {
        if (typeof c === 'number') return Math.trunc(c);
        if (typeof c === 'string') {
            const hex = c.trim().replace(/^#/, '');
            const parsed = parseInt(hex, 16);
            return isNaN(parsed) ? NaN : parsed;
        }
        return NaN;
    });
    return colors.some(isNaN) ? null : colors;
}

export async function GET() {
    try {
        const themes = await prisma.roomTheme.findMany({
            orderBy: [{ isVip: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
        });
        return ApiResponseHelper.success(themes, 'Oda temaları getirildi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function PATCH(req: Request) {
    try {
        const items: { id: number; sortOrder: number }[] = await req.json();
        await prisma.$transaction(
            items.map(({ id, sortOrder }) =>
                prisma.roomTheme.update({ where: { id }, data: { sortOrder } })
            )
        );
        return ApiResponseHelper.success(null, 'Sıralama güncellendi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { themeId, name, imageUrl, gradientColors, isVip, requiredVipLevel, sortOrder, isActive } = body;

        if (!themeId || !String(themeId).trim()) {
            return ApiResponseHelper.error('themeId zorunludur.', 400);
        }
        if (!name || !String(name).trim()) {
            return ApiResponseHelper.error('name zorunludur.', 400);
        }

        const colors = normalizeColors(gradientColors ?? []);
        if (colors === null) {
            return ApiResponseHelper.error('gradientColors sayı dizisi olmalıdır.', 400);
        }

        const existing = await prisma.roomTheme.findUnique({ where: { themeId: String(themeId).trim() } });
        if (existing) {
            return ApiResponseHelper.error('Bu themeId zaten kullanılıyor.', 400);
        }

        const theme = await prisma.roomTheme.create({
            data: {
                themeId: String(themeId).trim(),
                name: String(name).trim(),
                imageUrl: imageUrl || '',
                gradientColors: colors,
                isVip: !!isVip,
                requiredVipLevel: Number(requiredVipLevel ?? 0),
                sortOrder: Number(sortOrder ?? 0),
                isActive: isActive !== false,
            },
        });
        return ApiResponseHelper.success(theme, 'Tema oluşturuldu.', 201);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
