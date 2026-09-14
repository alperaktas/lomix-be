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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();

        let colors: number[] | undefined;
        if (body.gradientColors !== undefined) {
            const normalized = normalizeColors(body.gradientColors);
            if (normalized === null) {
                return ApiResponseHelper.error('gradientColors sayı dizisi olmalıdır.', 400);
            }
            colors = normalized;
        }

        if (body.themeId !== undefined) {
            const clash = await prisma.roomTheme.findFirst({
                where: { themeId: String(body.themeId).trim(), id: { not: Number(id) } },
            });
            if (clash) return ApiResponseHelper.error('Bu themeId zaten kullanılıyor.', 400);
        }

        const theme = await prisma.roomTheme.update({
            where: { id: Number(id) },
            data: {
                ...(body.themeId !== undefined && { themeId: String(body.themeId).trim() }),
                ...(body.name !== undefined && { name: String(body.name).trim() }),
                ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || '' }),
                ...(colors !== undefined && { gradientColors: colors }),
                ...(body.isVip !== undefined && { isVip: !!body.isVip }),
                ...(body.requiredVipLevel !== undefined && { requiredVipLevel: Number(body.requiredVipLevel) }),
                ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
                ...(body.isActive !== undefined && { isActive: !!body.isActive }),
            },
        });
        return ApiResponseHelper.success(theme, 'Tema güncellendi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const theme = await prisma.roomTheme.findUnique({ where: { id: Number(id) } });
        if (!theme) return ApiResponseHelper.error('Tema bulunamadı.', 404);

        // Temayı kullanan odalar varsa tema alanları boşa düşmesin diye uyarı veriyoruz.
        const inUse = await prisma.room.count({ where: { roomTheme: theme.themeId } });
        if (inUse > 0) {
            return ApiResponseHelper.error(
                `Bu tema ${inUse} odada kullanılıyor. Silmek yerine pasife alabilirsiniz.`,
                400
            );
        }

        await prisma.roomTheme.delete({ where: { id: Number(id) } });
        return ApiResponseHelper.success(null, 'Tema silindi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
