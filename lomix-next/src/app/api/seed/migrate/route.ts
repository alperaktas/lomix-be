import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        // Eski URL -> Yeni URL eşleşmesi
        const mapping: Record<string, string> = {
            '/users/user': '/dashboard/users',
            '/users/role': '/dashboard/roles',
            '/users/group': '/dashboard/groups',
            '/users/logs': '/dashboard/logs',
            '/settings': '/dashboard/settings',
            '/settings/menus': '/dashboard/menus',
            '/settings/apis': '/dashboard/endpoints',
            // İkon düzeltmeleri (FontAwesome to Tabler)
            'fa-tachometer-alt': 'ti-dashboard',
            'fa-list': 'ti-menu-2',
            'fa-code': 'ti-api',
            'fa-users': 'ti-users',
            'fa-cogs': 'ti-settings',
            'fa-layer-group': 'ti-layers-union',
            'fa-history': 'ti-history'
        };

        const menus = await prisma.menu.findMany();
        let updatedCount = 0;

        for (const menu of menus) {
            let updates: any = {};

            // URL güncelle
            if (menu.url && mapping[menu.url]) {
                updates.url = mapping[menu.url];
            }

            // İkon güncelle
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

        return NextResponse.json({ message: `${updatedCount} menü güncellendi!` });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
