import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const force = searchParams.get('force') === 'true';

        if (force) {
            await prisma.menu.deleteMany(); // Önce temizle
            // ID sequence reset gerekebilir ama Prisma genelde halleder veya auto-increment devam eder.
        }

        const count = await prisma.menu.count();
        if (count > 0 && !force) {
            return NextResponse.json({ message: 'Menüler zaten var. Yeniden oluşturmak için ?force=true kullanın.' });
        }

        // Ana Menüler
        const dashboard = await prisma.menu.create({
            data: { title: 'Dashboard', url: '/dashboard', icon: 'ti-home', order: 1 }
        });

        const system = await prisma.menu.create({
            data: { title: 'Sistem Yönetimi', url: '#', icon: 'ti-settings', order: 2 }
        });

        const logs = await prisma.menu.create({
            data: { title: 'Log Yönetimi', url: '/dashboard/logs', icon: 'ti-file-text', order: 3 }
        });

        // Alt Menüler
        await prisma.menu.createMany({
            data: [
                { title: 'Kullanıcılar', url: '/dashboard/users', icon: 'ti-user', parentId: system.id, order: 1 },
                { title: 'Roller', url: '/dashboard/roles', icon: 'ti-shield-lock', parentId: system.id, order: 2 },
                { title: 'Menüler', url: '/dashboard/menus', icon: 'ti-menu-2', parentId: system.id, order: 3 },
                { title: 'Gruplar', url: '/dashboard/groups', icon: 'ti-users', parentId: system.id, order: 4 },
                { title: 'Endpointler', url: '/dashboard/endpoints', icon: 'ti-api', parentId: system.id, order: 5 },
            ]
        });

        return NextResponse.json({ message: 'Menüler sıfırlandı ve yeniden eklendi!' });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
