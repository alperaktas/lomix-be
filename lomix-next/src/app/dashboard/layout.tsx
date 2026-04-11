"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
                <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border transition-all duration-300">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">
                                        Lomix Admin
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 pt-4 bg-muted/5">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
