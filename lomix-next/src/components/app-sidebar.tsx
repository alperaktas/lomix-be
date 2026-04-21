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
  ChevronRight,
  Radio,
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
  useSidebar
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
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
          title: "API Dökümantasyonu",
          url: "/dashboard/api-docs",
        },
        {
          title: "Sistem Logları",
          url: "/dashboard/system-logs",
        },
      ],
    },
    {
      title: "Oda Yönetimi",
      url: "#",
      icon: Radio,
      children: [
        { title: "Odalar", url: "/dashboard/rooms" },
        { title: "Raporlar", url: "/dashboard/rooms/reports" },
        { title: "Kelime Filtresi", url: "/dashboard/rooms/word-filters" },
        { title: "Test İstemcisi", url: "/dashboard/rooms/client" },
      ],
    },
    {
      title: "Ayarlar",
      url: "/dashboard/settings",
      icon: Settings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { state, setOpen, open } = useSidebar()
  const [isHovered, setIsHovered] = React.useState(false)
  const wasExpandedRef = React.useRef(open)

  // Hover anında state'i güncelle
  const handleMouseEnter = () => {
    if (!open) {
      wasExpandedRef.current = false
      setOpen(true)
      setIsHovered(true)
    } else {
      wasExpandedRef.current = true
    }
  }

  const handleMouseLeave = () => {
    if (isHovered && !wasExpandedRef.current) {
      setOpen(false)
      setIsHovered(false)
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "border-r border-border transition-all duration-300 ease-in-out",
        !open && "shadow-none",
        isHovered && "shadow-2xl z-50"
      )}
    >
      <SidebarHeader className="h-16 border-b border-border p-0 flex flex-row items-center bg-card overflow-hidden">
        <Link
          href="/dashboard"
          className={cn(
            "flex h-full items-center transition-all duration-300 w-full px-2.5",
            open && "px-4"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm border border-border/60">
            <img
              src="/img/logo.png"
              alt="Lomix"
              className="h-5 w-5 object-contain"
            />
          </div>
          {open && (
            <span className="font-bold text-base tracking-tighter whitespace-nowrap animate-in fade-in duration-500 ml-3 text-black">
              Lomix Admin
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="no-scrollbar overflow-x-hidden bg-card">
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
                      <SidebarMenuButton
                        tooltip={!open ? item.title : undefined}
                        isActive={active}
                        className={cn(
                          "transition-all duration-200",
                          active && "bg-primary/5 text-primary border-r-2 border-r-primary rounded-none shadow-[inset_4px_0_0_0_rgba(var(--primary),1)]"
                        )}
                      >
                        {item.icon && <item.icon className={cn(active && "text-primary")} />}
                        <span className={cn(active && "font-bold text-primary")}>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.children?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                              <Link href={subItem.url} className={cn("whitespace-nowrap transition-colors", pathname === subItem.url && "text-primary font-bold")}>
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
                <SidebarMenuButton
                  asChild
                  tooltip={!open ? item.title : undefined}
                  isActive={pathname === item.url}
                  className={cn(
                    "transition-all duration-200",
                    pathname === item.url && "bg-primary/5 text-primary border-r-2 border-r-primary rounded-none"
                  )}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon className={cn(pathname === item.url && "text-primary")} />}
                    <span className={cn("text-black", pathname === item.url && "font-bold text-primary")}>
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-0 min-h-14 bg-card overflow-hidden">
        <div className={cn(
          "flex h-full items-center transition-all duration-300 py-3 px-2.5",
          open && "px-4"
        )}>
          <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          {open && (
            <div className="flex flex-col text-sm truncate animate-in fade-in duration-300 ml-3 whitespace-nowrap">
              <span className="font-semibold text-black leading-none">Admin</span>
              <span className="text-muted-foreground text-[10px] mt-1 uppercase tracking-tighter">Lomix Panel</span>
            </div>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
