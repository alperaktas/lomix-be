import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

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
        logEntry = await prisma.socialAuthLog.create({
            data: {
                provider,
                incomingRequest: JSON.stringify(body),
                ipAddress,
                userAgent: userAgent || deviceInfo
            }
        });

        let socialUser: any = {};

        // 2. Provider Doğrulama
        if (provider === 'google') {
            const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            const audiences = [
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_ANDROID_CLIENT_ID,
                process.env.GOOGLE_IOS_CLIENT_ID
            ].filter(Boolean) as string[];

            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: audiences.length > 0 ? audiences : process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();

            if (!payload) throw new Error('Google payload boş.');

            socialUser = {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                sub: payload.sub
            };

            await prisma.socialAuthLog.update({
                where: { id: logEntry.id },
                data: { verificationRequest: 'Google verifyIdToken', providerResponse: JSON.stringify(payload) }
            });

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
        let user = await prisma.user.findFirst({ where: { email: socialUser.email } });

        if (!user) {
            const randomPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            const baseUsername = socialUser.name || socialUser.email?.split('@')[0] || 'user';
            const uniqueUsername = `${baseUsername.replace(/\s+/g, '')}_${Math.floor(Math.random() * 10000)}`;

            user = await prisma.user.create({
                data: {
                    username: uniqueUsername,
                    email: socialUser.email,
                    password: hashedPassword,
                    role: 'user',
                    status: 'active',
                    avatar: socialUser.picture
                }
            });
        } else {
            if (user.status === 'suspended') {
                return { error: 'Hesabınız askıya alınmıştır.', status: 403, code: 'ACCOUNT_SUSPENDED' };
            }
            if (socialUser.picture && user.avatar !== socialUser.picture) {
                await prisma.user.update({ where: { id: user.id }, data: { avatar: socialUser.picture } });
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
        await prisma.socialAuthLog.update({
            where: { id: logEntry.id },
            data: { appResponse: JSON.stringify(appResponse) }
        });

        return { data: appResponse, status: 200 };

    } catch (error: any) {
        console.error(`${provider} Auth Error:`, error);

        if (logEntry) {
            await prisma.socialAuthLog.update({
                where: { id: logEntry.id },
                data: { errorMessage: error.message, appResponse: JSON.stringify({ error_code: 'SERVER_ERROR' }) }
            }).catch(() => { });
        }

        return { error: error.message, status: 500, code: 'SERVER_ERROR' };
    }
};
