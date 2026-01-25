import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// JWT Secret'ı Uint8Array olarak hazırlamamız lazım (jose kütüphanesi için)
const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli'
);

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Auth gerektirmeyen Public yollar
    const publicPaths = [
        '/',
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/img',
        '/libs',
        '/uploads' // Statik dosyalar
    ];

    if (publicPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // 2. Token Kontrolü (Hem API hem Dashboard için)
    // Dashboard sayfaları için cookie kontrolü, API için Header kontrolü yapabiliriz.
    // Ancak basitleştirmek adına şimdilik client-side auth kullanıyoruz dashboard'da.
    // Yine de güvenliği artırmak için Dashboard'a giden isteklerde cookie bakılabilir.
    // Biz şimdilik API güvenliğine odaklanalım.

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
            return NextResponse.next();
        }

        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return NextResponse.json({ message: 'Yetkisiz erişim: Token yok' }, { status: 401 });
        }

        try {
            // JWT'yi doğrula ve içeriği al
            const { payload } = await jwtVerify(token, SECRET_KEY);

            // Eğer admin paneli API'lerine erişiliyorsa role kontrolü yap
            const adminOnlyPaths = ['/api/users', '/api/groups', '/api/roles', '/api/menus', '/api/system', '/api/logs', '/api/docs'];
            if (adminOnlyPaths.some(path => pathname.startsWith(path))) {
                if (payload.role !== 'admin') {
                    return NextResponse.json({ message: 'Yetkisiz erişim: Admin yetkisi gerekli' }, { status: 403 });
                }
            }

            return NextResponse.next();
        } catch (err) {
            return NextResponse.json({ message: 'Geçersiz veya süresi dolmuş token' }, { status: 401 });
        }
    }

    // Dashboard sayfaları (Server-side koruma isterseniz burayı açın)
    /*
    if (pathname.startsWith('/dashboard')) {
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }
    */

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/api/:path*'
    ],
};
