import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli'
);

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

    // POST/PUT/PATCH body'lerini logla
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
            const cloned = request.clone();
            const text = await cloned.text();
            if (text) {
                // Content-Type kontrolü: multipart/form-data ise sadece keys göster
                const contentType = request.headers.get('content-type') || '';
                if (contentType.includes('multipart/form-data')) {
                    const boundary = contentType.split('boundary=')[1]?.split(';')[0]?.trim();
                    const fieldCount = (text.match(/--{1,2}[\w-]+/g) || []).length / 2 - 1;
                    console.log(`  Body: (multipart, ~${Math.max(0, fieldCount)} fields)`);
                } else {
                    try {
                        const json = JSON.parse(text);
                        const redactKeys = new Set([
                            'token',
                            'idToken',
                            'accessToken',
                            'refreshToken',
                            'password',
                            'newPassword',
                            'oldPassword'
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
            }
        } catch (e: any) {
            console.log(`  Body: (okunamadı - ${e.message})`);
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
        '/uploads'
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
                const origin = request.nextUrl.origin;
                const banRes = await fetch(`${origin}/api/auth/check-ban?userId=${payload.id}`);
                const banStatus = await banRes.json();
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
