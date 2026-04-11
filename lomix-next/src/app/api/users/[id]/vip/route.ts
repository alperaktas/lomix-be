import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT: VIP tanımla
export async function PUT(req: Request, { params }: any) {
    try {
        const { id } = await params;
        const userId = Number(id);
        const { vipLevel, duration } = await req.json();

        if (vipLevel === undefined || typeof vipLevel !== 'number' || vipLevel < 0 || vipLevel > 10) {
            return NextResponse.json({ message: 'Geçerli bir VIP level belirtin (0-10, 0 = kaldır)' }, { status: 400 });
        }

        const updateData: any = {
            vipLevel,
            isVip: vipLevel > 0,
        };

        // VIP kaldırılıyorsa
        if (vipLevel === 0) {
            updateData.vipExpiresAt = null;
        } else if (duration === 'permanent') {
            updateData.vipExpiresAt = null;
        } else if (duration) {
            const match = String(duration).match(/^(\d+)(d)$/);
            if (!match) {
                return NextResponse.json({ message: 'Geçersiz süreç formatı' }, { status: 400 });
            }
            const days = parseInt(match[1]);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + days);
            updateData.vipExpiresAt = expiresAt;
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        await prisma.userLog.create({
            data: {
                userId,
                action: vipLevel === 0
                    ? 'VIP kaldırıldı'
                    : `VIP tanımlandı: Level ${vipLevel}${duration === 'permanent' ? ' (süresiz)' : ` (${duration})`}`,
            }
        });

        return NextResponse.json({
            message: vipLevel === 0 ? 'VIP kaldırıldı' : 'VIP tanımlandı',
            vipLevel: user.vipLevel,
            isVip: user.isVip,
            vipExpiresAt: user.vipExpiresAt,
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
