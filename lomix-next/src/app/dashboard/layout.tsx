"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { QuickSearch } from "@/components/quick-search"

const LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    users: 'Kullanıcılar',
    rooms: 'Odalar',
    groups: 'Gruplar',
    roles: 'Roller',
    logs: 'Loglar',
    'system-logs': 'Sistem Logları',
    settings: 'Ayarlar',
    reports: 'Raporlar',
    'word-filters': 'Kelime Filtresi',
    client: 'Test İstemcisi',
    agency: 'Ajanslar',
    profile: 'Profilim',
    endpoints: 'Endpoint\'ler',
    'api-docs': 'API Dökümanları',
};

function segmentLabel(seg: string) {
    if (LABELS[seg]) return LABELS[seg];
    if (/^\d+$/.test(seg)) return `#${seg}`;
    return seg;
}

function DynamicBreadcrumb() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    const crumbs = segments.map((seg, i) => ({
        label: segmentLabel(seg),
        href: '/' + segments.slice(0, i + 1).join('/'),
    }));

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Lomix Admin</BreadcrumbLink>
                </BreadcrumbItem>
                {crumbs.map((crumb, i) => (
                    <span key={crumb.href} className="flex items-center gap-1.5">
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem>
                            {i === crumbs.length - 1 ? (
                                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </span>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token) {
            router.replace('/');
            return;
        }

        try {
            if (userStr) {
                const user = JSON.parse(userStr);
                if (user.role !== 'admin') {
                    alert("Bu sayfaya erişmek için Admin yetkiniz olması gerekir.");
                    router.replace('/');
                    return;
                }
            } else {
                router.replace('/');
                return;
            }
            setIsAuthorized(true);
        } catch (e) {
            console.error("Auth check error:", e);
            router.replace('/');
        }
    }, [router]);

    if (!isAuthorized) {
        return <div className="flex h-screen w-full items-center justify-center p-5 text-center bg-background">Yönlendiriliyorsunuz...</div>;
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4 transition-all duration-300">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <DynamicBreadcrumb />
                    </div>
                    <QuickSearch />
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 pt-4 bg-muted/5">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
