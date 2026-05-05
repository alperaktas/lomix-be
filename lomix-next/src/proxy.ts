import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli'
);

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

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
