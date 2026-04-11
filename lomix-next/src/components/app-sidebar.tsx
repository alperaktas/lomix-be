"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileText,
  Settings,
  Terminal,
  ChevronRight,
  MonitorPlay,
  History
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Menü Verisi
const data = {
  user: {
    name: "Admin",
    email: "admin@lomix.com",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Kullanıcı Yönetimi",
      url: "/dashboard/users",
      icon: Users,
    },
    {
      title: "Roller & Yetkiler",
      url: "/dashboard/roles",
      icon: ShieldCheck,
    },
    {
      title: "İçerik Yönetimi",
      url: "#",
      icon: FileText,
      children: [
        {
          title: "Endpoints",
          url: "/dashboard/endpoints",
        },
        {
          title: "Sistem Logları",
          url: "/dashboard/logs",
        },
      ],
    },
    {
      title: "Ayarlar",
      url: "/dashboard/settings",
      icon: Settings,
    },
  ],
  navSecondary: [
    {
      title: "API Dokümanları",
      url: "/dashboard/api-docs",
      icon: Terminal,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border bg-sidebar">
      <SidebarHeader className="h-16 border-b border-border flex items-center justify-center">
        <Link href="/dashboard" className="flex items-center gap-2 px-4">
             <span className="flex font-bold text-2xl tracking-tighter">
                <span className="text-blue-500">L</span>
                <span className="text-red-500">O</span>
                <span className="text-yellow-500">M</span>
                <span className="text-green-500">I</span>
                <span className="text-purple-500">X</span>
            </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-2 py-4">
          {data.navMain.map((item) => {
             const active = pathname === item.url || item.children?.some(child => pathname === child.url)
             
             if (item.children) {
                return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={active}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title} isActive={active}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children?.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                )
             }

             return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}>
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-4">
          <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col text-sm truncate">
                <span className="font-medium text-foreground">Admin</span>
                <span className="text-muted-foreground text-xs">admin@lomix.com</span>
              </div>
          </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
