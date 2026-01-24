import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        // Yeni URL (Next.js) -> Eski URL (Node.js/EJS) Revert Mapping
        const mapping: Record<string, string> = {
            '/dashboard/users': '/users/user',
            '/dashboard/roles': '/users/role',
            '/dashboard/groups': '/users/group',
            '/dashboard/logs': '/users/logs',
            '/dashboard/settings': '/settings',
            '/dashboard/menus': '/settings/menus',
            '/dashboard/endpoints': '/settings/apis',
            // İkon Geri Alma (Tabler -> FontAwesome)
            'ti-dashboard': 'fa-tachometer-alt',
            'ti-menu-2': 'fa-list',
            'ti-api': 'fa-code',
            'ti-users': 'fa-users',
            'ti-settings': 'fa-cogs',
            'ti-layers-union': 'fa-layer-group',
            'ti-history': 'fa-history',
            'ti-user': 'fa-user',
            'ti-shield-lock': 'fa-shield-alt',
            'ti-home': 'fa-home',
            'ti-file-text': 'fa-file-alt'
        };

        const menus = await prisma.menu.findMany();
        let updatedCount = 0;

        for (const menu of menus) {
            let updates: any = {};

            // URL güncelle (Tersine çevir)
            if (menu.url && mapping[menu.url]) {
                updates.url = mapping[menu.url];
            }

            // İkon güncelle (Tersine çevir)
            if (menu.icon && mapping[menu.icon]) {
                updates.icon = mapping[menu.icon];
            }

            if (Object.keys(updates).length > 0) {
                await prisma.menu.update({
                    where: { id: menu.id },
                    data: updates
                });
                updatedCount++;
            }
        }

        return NextResponse.json({ message: `Geri alma işlemi başarılı! ${updatedCount} menü eski haline döndürüldü.` });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
