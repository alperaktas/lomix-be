import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Ban uygula (temporary / permanent / device)
export async function POST(req: Request, { params }: any) {
    try {
        const { id } = await params;
        const userId = Number(id);
        const { type, reason, duration, deviceId } = await req.json();

        if (!type || !['temporary', 'permanent', 'device'].includes(type)) {
            return NextResponse.json({ message: 'Geçersiz ban türü' }, { status: 400 });
        }

        let expiresAt: Date | null = null;
        const userData: any = { banReason: reason || null };

        if (type === 'temporary') {
            if (!duration) {
                return NextResponse.json({ message: 'Süreli ban için süre belirtmelisiniz' }, { status: 400 });
            }
            
            const match = String(duration).match(/^(\d+)(h|d)$/);
            if (!match) {
                return NextResponse.json({ message: 'Geçersiz süre formatı' }, { status: 400 });
            }
            const amount = parseInt(match[1]);
            const unit = match[2];
            expiresAt = new Date();
            if (unit === 'h') expiresAt.setHours(expiresAt.getHours() + amount);
            if (unit === 'd') expiresAt.setDate(expiresAt.getDate() + amount);

            userData.bannedUntil = expiresAt;
            userData.isPermanentBan = false;
            userData.status = 'banned';
        } else if (type === 'permanent') {
            userData.bannedUntil = null;
            userData.isPermanentBan = true;
            userData.status = 'banned';
        } else if (type === 'device') {
            if (!deviceId) {
                return NextResponse.json({ message: 'Cihaz ban için device ID gereklidir' }, { status: 400 });
            }
            userData.bannedDeviceId = deviceId;
            userData.isPermanentBan = true;
            userData.status = 'banned';
        }

        // User güncelle
        await prisma.user.update({
            where: { id: userId },
            data: userData,
        });

        // Ban kaydı oluştur
        await prisma.userBan.create({
            data: {
                userId,
                type,
                reason: reason || null,
                duration: duration ? String(duration) : null,
                expiresAt,
                deviceId: deviceId || null,
                isActive: true,
            }
        });

        return NextResponse.json({ message: 'Ban uygulandı', type, expiresAt });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
