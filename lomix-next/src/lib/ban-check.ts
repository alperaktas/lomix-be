import prisma from './prisma';

export interface BanStatus {
    banned: boolean;
    message?: string;
    expiresAt?: Date | null;
}

/**
 * Checks if a user is currently banned.
 * Returns an object with 'banned' status and a descriptive message.
 */
export async function checkUserBanStatus(userId: number): Promise<BanStatus> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                status: true,
                bannedUntil: true,
                isPermanentBan: true,
                banReason: true
            }
        });

        if (!user) {
            return { banned: false };
        }

        const now = new Date();

        // 1. Permanent Ban check
        if (user.isPermanentBan || user.status === 'suspended') {
            return {
                banned: true,
                message: `Hesabınız kalıcı olarak kapatılmıştır. Sebep: ${user.banReason || 'Belirtilmedi'}. Bir hata olduğunu düşünüyorsanız lütfen destek ile iletişime geçin.`
            };
        }

        // 2. Temporary Ban check
        if (user.bannedUntil && new Date(user.bannedUntil) > now) {
            const timeLeft = getTimeLeftMessage(new Date(user.bannedUntil));
            return {
                banned: true,
                expiresAt: user.bannedUntil,
                message: `Hesabınız geçici olarak askıya alınmıştır. Kalan süre: ${timeLeft}. Sebep: ${user.banReason || 'Belirtilmedi'}. Bir hata olduğunu düşünüyorsanız lütfen destek ile iletişime geçin.`
            };
        }

        return { banned: false };
    } catch (error) {
        console.error("Ban check error:", error);
        return { banned: false }; // Fail open for safety or close for security? Open implies less frustration if DB is down.
    }
}

/**
 * Helper to format remaining time
 */
function getTimeLeftMessage(bannedUntil: Date): string {
    const now = new Date();
    const diffMs = bannedUntil.getTime() - now.getTime();
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const parts = [];
    if (diffDays > 0) parts.push(`${diffDays} gün`);
    if (diffHours > 0) parts.push(`${diffHours} saat`);
    if (diffMinutes > 0) parts.push(`${diffMinutes} dakika`);

    return parts.length > 0 ? parts.join(', ') : "birkaç saniye";
}
