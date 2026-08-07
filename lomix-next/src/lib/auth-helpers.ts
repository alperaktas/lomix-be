import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/** Minimal Google tokeninfo response type */
interface GoogleTokenPayload {
    iss: string;
    sub: string;
    azp: string;
    aud: string;
    iat: string;
    exp: string;
    email?: string;
    email_verified?: string;
    name?: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
    locale?: string;
}

const DB_RETRY_MAX = 3;
const DB_RETRY_DELAY_MS = 700;

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientDbError(error: unknown): boolean {
    const message = String((error as any)?.message || '').toLowerCase();
    const name = String((error as any)?.name || '').toLowerCase();
    return (
        message.includes('the database system is not yet accepting connections') ||
        message.includes('consistent recovery state has not been yet reached') ||
        message.includes('the database system is in recovery mode') ||
        message.includes('rejecting connections') ||
        message.includes('can\'t reach database server') ||
        message.includes('connection terminated unexpectedly') ||
        name.includes('prismaclientinitializationerror')
    );
}

async function withDbRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= DB_RETRY_MAX; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (!isTransientDbError(error) || attempt === DB_RETRY_MAX) {
                throw error;
            }
            console.warn(`[DB RETRY] ${label} attempt ${attempt}/${DB_RETRY_MAX} failed, retrying...`);
            await sleep(DB_RETRY_DELAY_MS * attempt);
        }
    }
    throw lastError;
}

function getGoogleAudiences(): string[] {
    const raw = [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
        process.env.GOOGLE_CLIENT_IDS,
    ].filter(Boolean) as string[];

    const split = raw
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value) => value !== 'your_google_id');

    return Array.from(new Set(split));
}

export const handleSocialAuth = async (req: Request, provider: 'google' | 'facebook' | 'apple') => {
    let logEntry: any;
    try {
        const body = await req.json();
        const { token, deviceInfo } = body;
        const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        if (!token) {
            return { error: 'Token bilgisi gönderilmedi.', status: 400, code: 'VALIDATION_ERROR' };
        }

        // 1. Log Başlat
        try {
            logEntry = await withDbRetry(() => prisma.socialAuthLog.create({
                data: {
                    provider,
                    incomingRequest: JSON.stringify(body),
                    ipAddress,
                    userAgent: userAgent || deviceInfo
                }
            }), 'socialAuthLog.create');
        } catch (logError) {
            // Log tablosu geçici olarak erişilemezse auth akışını düşürme.
            console.warn(`${provider} Auth Log Start Skipped:`, (logError as any)?.message || logError);
            logEntry = null;
        }

        let socialUser: any = {};

        // 2. Provider Doğrulama
        if (provider === 'google') {
            const audiences = getGoogleAudiences();
            if (audiences.length === 0) {
                return {
                    error: 'Google giriş yapılandırması eksik. GOOGLE_CLIENT_ID/GOOGLE_CLIENT_IDS ayarlayın.',
                    status: 500,
                    code: 'GOOGLE_CONFIG_MISSING'
                };
            }

            // Token'ı Google'ın tokeninfo endpoint'i ile doğrula.
            // Not: google-auth-library'nin kullandığı www.googleapis.com/oauth2/v1/certs
            // sunucunun IP'sinden erişilemediği için doğrudan tokeninfo kullanılıyor.
            const tokeninfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`;
            const tokeninfoRes = await fetch(tokeninfoUrl);

            if (!tokeninfoRes.ok) {
                const errorText = await tokeninfoRes.text();
                throw new Error(`Google token doğrulama başarısız (${tokeninfoRes.status}): ${errorText}`);
            }

            const payload: GoogleTokenPayload = await tokeninfoRes.json();

            // Audience doğrulaması - token hangi client ID için oluşturulmuş?
            if (!audiences.includes(payload.aud)) {
                throw new Error(
                    `Google token audience uyuşmazlığı. Token: ${payload.aud}, Beklenen: ${audiences.join(', ')}`
                );
            }

            socialUser = {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                sub: payload.sub
            };

            if (logEntry) {
                await withDbRetry(() => prisma.socialAuthLog.update({
                    where: { id: logEntry.id },
                    data: { verificationRequest: 'Google tokeninfo', providerResponse: JSON.stringify(payload) }
                }), 'socialAuthLog.update.verification');
            }

        } else if (provider === 'facebook') {
            // Mock Facebook - İleride SDK eklenebilir
            socialUser = {
                email: `fb_user_${Math.floor(Math.random() * 1000)}@facebook.com`,
                name: "Facebook User",
                picture: ""
            };
        } else if (provider === 'apple') {
            // Mock Apple - İleride SDK eklenebilir
            socialUser = {
                email: `apple_user_${Math.floor(Math.random() * 1000)}@privaterelay.appleid.com`,
                name: "Apple User",
                picture: ""
            };
        }

        // 3. Veritabanı İşlemleri
        let user = await withDbRetry(() => prisma.user.findFirst({ where: { email: socialUser.email } }), 'user.findFirst');

        if (!user) {
            const randomPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            const baseUsername = socialUser.name || socialUser.email?.split('@')[0] || 'user';
            const uniqueUsername = `${baseUsername.replace(/\s+/g, '')}_${Math.floor(Math.random() * 10000)}`;

            user = await withDbRetry(() => prisma.user.create({
                data: {
                    username: uniqueUsername,
                    email: socialUser.email,
                    password: hashedPassword,
                    role: 'user',
                    status: 'active',
                    avatar: socialUser.picture
                }
            }), 'user.create');
        } else {
            if (user.status === 'suspended') {
                return { error: 'Hesabınız askıya alınmıştır.', status: 403, code: 'ACCOUNT_SUSPENDED' };
            }
            if (socialUser.picture && user.avatar !== socialUser.picture) {
                await withDbRetry(() => prisma.user.update({ where: { id: user!.id }, data: { avatar: socialUser.picture } }), 'user.update.avatar');
            }
        }

        // 4. Token Üretimi
        const appToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'gizli_anahtar',
            { expiresIn: '30d' }
        );

        const appResponse = {
            message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} ile giriş başarılı.`,
            token: appToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        };

        // Log Güncelle
        if (logEntry) {
            await withDbRetry(() => prisma.socialAuthLog.update({
                where: { id: logEntry.id },
                data: { appResponse: JSON.stringify(appResponse) }
            }), 'socialAuthLog.update.appResponse');
        }

        return { data: appResponse, status: 200 };

    } catch (error: any) {
        console.error(`${provider} Auth Error:`, error);

        if (logEntry) {
            await withDbRetry(() => prisma.socialAuthLog.update({
                where: { id: logEntry.id },
                data: { errorMessage: error.message, appResponse: JSON.stringify({ error_code: 'SERVER_ERROR' }) }
            }), 'socialAuthLog.update.error').catch(() => { });
        }

        const message = String(error?.message || 'Bilinmeyen hata');
        if (provider === 'google' && /Wrong recipient|audience/i.test(message)) {
            return {
                error: 'Google token audience uyuşmuyor. Mobil/Web Client ID değerlerini backend .env içine ekleyin.',
                status: 401,
                code: 'GOOGLE_AUDIENCE_MISMATCH'
            };
        }

        if (isTransientDbError(error)) {
            return {
                error: 'Veritabanı şu anda hazırlanıyor. Lütfen birkaç saniye sonra tekrar deneyin.',
                status: 503,
                code: 'DB_NOT_READY'
            };
        }

        return { error: message, status: 500, code: 'SERVER_ERROR' };
    }
};
