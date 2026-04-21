import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// JWT Secret'ı Uint8Array olarak hazırlamamız lazım (jose kütüphanesi için)
const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli'
);

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    console.log(`[Middleware] Request Path: ${pathname}, Method: ${request.method}`);

    // 1. CORS Preflight İsteği (OPTIONS)
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

    // Helper: Response'a CORS header'ları ekler
    const addCorsHeaders = (res: NextResponse) => {
        res.headers.set('Access-Control-Allow-Origin', '*');
        res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.headers.set('Access-Control-Allow-Headers', '*');
        return res;
    };

    // 2. Auth gerektirmeyen Public yollar
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

    // Tam eşleşme veya bir alt yol ise izin ver
    if (pathname === '/' || publicPaths.some(path => pathname.startsWith(path))) {
        return addCorsHeaders(NextResponse.next());
    }

    // 3. API İstekleri Kontrolü
    if (pathname.startsWith('/api/')) {
        // Mobil API'ler için Public (Açık) yollar
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

        // Eğer yol bu public listesinde ise JWT sorma
        if (publicMobilePaths.some(path => pathname.startsWith(path))) {
            return addCorsHeaders(NextResponse.next());
        }

        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return addCorsHeaders(NextResponse.json({ message: 'Yetkisiz erişim: Token yok' }, { status: 401 }));
        }

        try {
            // JWT'yi doğrula ve içeriği al
            const { payload } = await jwtVerify(token, SECRET_KEY);

            // REAL-TIME BAN KONTROLÜ
            // Sadece API ve dashboard isteklerinde kontrol yapalım
            try {
                const origin = request.nextUrl.origin;
                const banCheckResponse = await fetch(`${origin}/api/auth/check-ban?userId=${payload.id}`);
                const banStatus = await banCheckResponse.json();

                if (banStatus.banned) {
                    return addCorsHeaders(NextResponse.json({ 
                        message: banStatus.message || 'Hesabınız askıya alınmıştır.',
                        banned: true 
                    }, { status: 403 }));
                }
            } catch (banError) {
                console.error("Middleware ban check silent error:", banError);
                // Sessiz hata: DB/API ulaşılmazsa geçişe izin veriyoruz (fail-open)
            }

            // Eğer admin paneli API'lerine erişiliyorsa role kontrolü yap
            const adminOnlyPaths = ['/api/users', '/api/groups', '/api/roles', '/api/system', '/api/logs'];
            if (adminOnlyPaths.some(path => pathname.startsWith(path))) {
                if (payload.role !== 'admin') {
                    return addCorsHeaders(NextResponse.json({ message: 'Yetkisiz erişim: Admin yetkisi gerekli' }, { status: 403 }));
                }
            }

            return addCorsHeaders(NextResponse.next());
        } catch (err) {
            return addCorsHeaders(NextResponse.json({ message: 'Geçersiz veya süresi dolmuş token' }, { status: 401 }));
        }
    }

    return addCorsHeaders(NextResponse.next());
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/api/:path*',
        '/swagger.json'
    ],
};
