import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { checkUserBanStatus } from '@/lib/ban-check';

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli'
);

/** Loglanacak en büyük istek gövdesi. */
const MAX_LOGGED_BODY_BYTES = 64 * 1024;

/**
 * Yasaklı mı kontrolü her kimlikli API isteğinde yapılır. Eskiden bunun için proxy kendi sunucusuna bir HTTP isteği
 * (/api/auth/check-ban) atıyordu: her istekte ikinci bir fonksiyon çağrısı + sorgu. Artık süreç içinde kontrol edilir
 * ve "yasaklı değil" sonucu kısa süre hatırlanır; yasak en geç bu sürede (aynı sunucu örneğinde) devreye girer.
 * Yasaklı sonuç hiç önbelleğe alınmaz, yasak kaldırılınca hemen geçerli olur.
 */
const NOT_BANNED_TTL_MS = 30_000;
const NOT_BANNED_CACHE_MAX = 5000;
const notBannedUntil = new Map<number, number>();

async function banStatusFor(userId: number) {
    const now = Date.now();
    if ((notBannedUntil.get(userId) ?? 0) > now) return { banned: false } as const;

    const status = await checkUserBanStatus(userId);
    if (status.banned) {
        notBannedUntil.delete(userId);
    } else {
        if (notBannedUntil.size >= NOT_BANNED_CACHE_MAX) notBannedUntil.clear();
        notBannedUntil.set(userId, now + NOT_BANNED_TTL_MS);
    }
    return status;
}

export async function proxy(request: NextRequest) {
    const originalPathname = request.nextUrl.pathname;
    // Çift slash'ları normalize et (//api/ -> /api/)
    const normalizedPathname = originalPathname.replace(/\/+/g, '/');
    request.nextUrl.pathname = normalizedPathname;
    const { pathname } = request.nextUrl;

    // Eğer pathname değiştiyse (çift slash varsa), rewrite ile düzelt
    if (originalPathname !== normalizedPathname) {
        console.log(`[MIDDLEWARE] Normalize: ${originalPathname} -> ${normalizedPathname}`);
        return NextResponse.rewrite(request.nextUrl);
    }

    // Debug: gelen tüm istekleri logla
    console.log(`[${request.method}] ${pathname}`);

    // POST/PUT/PATCH body'lerini logla. Yüklemeler (multipart, 50MB'a kadar) ve büyük gövdeler okunmaz:
    // gövdeyi proxy'de metne çevirmek her yüklemede bellek ve süre harcar.
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentType = request.headers.get('content-type') || '';
        const contentLength = Number(request.headers.get('content-length') || 0);
        if (contentType.includes('multipart/form-data')) {
            console.log('  Body: (multipart, okunmadı)');
        } else if (contentLength > MAX_LOGGED_BODY_BYTES) {
            console.log(`  Body: (${contentLength} bayt, okunmadı)`);
        } else {
            try {
                const cloned = request.clone();
                const text = await cloned.text();
                if (text) {
                    try {
                        const json = JSON.parse(text);
                        const redactKeys = new Set([
                            'token',
                            'idToken',
                            'accessToken',
                            'refreshToken',
                            'password',
                            'newPassword',
                            'oldPassword',
                            'phone_number'
                        ]);
                        const redacted = Object.fromEntries(
                            Object.entries(json).map(([key, value]) => {
                                if (redactKeys.has(key)) {
                                    const textValue = typeof value === 'string' ? value : String(value);
                                    const masked = textValue.length > 12
                                        ? `${textValue.slice(0, 6)}...${textValue.slice(-4)}`
                                        : '***';
                                    return [key, `[REDACTED:${masked}]`];
                                }
                                return [key, value];
                            })
                        );
                        console.log(`  Body: ${JSON.stringify(redacted, null, 2)}`);
                    } catch {
                        // URL-encoded veya düz metin
                        console.log(`  Body: ${text.length > 500 ? text.substring(0, 500) + '...' : text}`);
                    }
                }
            } catch (e: any) {
                console.log(`  Body: (okunamadı - ${e.message})`);
            }
        }
    }

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    const addCors = (res: NextResponse) => {
        res.headers.set('Access-Control-Allow-Origin', '*');
        res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.headers.set('Access-Control-Allow-Headers', '*');
        return res;
    };

    // 2. Public yollar
    const publicPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/api/auth/check-ban',
        '/api/docs',
        '/swagger.json',
        '/img',
        '/libs',
        '/uploads',
        // Vercel zamanlanmış işleri JWT taşımaz; route kendi CRON_SECRET kontrolünü yapar.
        '/api/cron'
    ];

    if (pathname === '/' || publicPaths.some(p => pathname.startsWith(p))) {
        return addCors(NextResponse.next());
    }

    // 3. API kontrolü
    if (pathname.startsWith('/api/')) {
        const publicMobilePaths = [
            '/api/mobile/auth/login',
            '/api/mobile/auth/register',
            '/api/mobile/auth/forgot-password',
            '/api/mobile/auth/verify',
            '/api/mobile/auth/reset-password',
            '/api/mobile/auth/logout',
            '/api/mobile/auth/google',
            '/api/mobile/auth/facebook',
            '/api/mobile/auth/apple'
        ];

        if (publicMobilePaths.some(p => pathname.startsWith(p))) {
            return addCors(NextResponse.next());
        }

        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) {
            console.warn(`[AUTH 401] ${request.method} ${pathname} - Token yok`);
            return addCors(NextResponse.json({ message: 'Yetkisiz erişim: Token yok' }, { status: 401 }));
        }

        try {
            const { payload } = await jwtVerify(token, SECRET_KEY);

            try {
                const banStatus = await banStatusFor(Number(payload.id));
                if (banStatus.banned) {
                    return addCors(NextResponse.json({
                        message: banStatus.message || 'Hesabınız askıya alınmıştır.',
                        banned: true
                    }, { status: 403 }));
                }
            } catch {
                // Sessiz hata: fail-open
            }

            const adminOnlyPaths = ['/api/users', '/api/groups', '/api/roles', '/api/system', '/api/logs'];
            if (adminOnlyPaths.some(p => pathname.startsWith(p))) {
                if (payload.role !== 'admin') {
                    return addCors(NextResponse.json({ message: 'Yetkisiz erişim: Admin yetkisi gerekli' }, { status: 403 }));
                }
            }

            return addCors(NextResponse.next());
        } catch {
            console.warn(`[AUTH 401] ${request.method} ${pathname} - Gecersiz veya suresi dolmus token`);
            return addCors(NextResponse.json({ message: 'Geçersiz veya süresi dolmuş token' }, { status: 401 }));
        }
    }

    return addCors(NextResponse.next());
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/api/:path*',
        '/swagger.json'
    ],
};
