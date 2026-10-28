"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Settings,
  ChevronRight,
  Radio,
  MessagesSquare,
  LogOut,
  Wallet,
  Headset,
  Building2,
  Code2,
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

type NavChild = { title: string; url: string }
type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; children?: NavChild[] }

const data: { navMain: NavItem[] } = {
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    {
      title: "Kullanıcılar",
      url: "#",
      icon: Users,
      children: [
        { title: "Kullanıcı Yönetimi", url: "/dashboard/users" },
        { title: "Roller & Yetkiler", url: "/dashboard/roles" },
        { title: "Seviyeler", url: "/dashboard/settings/levels" },
      ],
    },
    {
      title: "Ajanslar",
      url: "#",
      icon: Building2,
      children: [
        { title: "Ajanslar", url: "/dashboard/agencies" },
        { title: "Ajans Başvuruları", url: "/dashboard/agency-applications" },
      ],
    },
    {
      title: "Odalar",
      url: "#",
      icon: Radio,
      children: [
        { title: "Odalar", url: "/dashboard/rooms" },
        { title: "Raporlar", url: "/dashboard/rooms/reports" },
        { title: "Kelime Filtresi", url: "/dashboard/rooms/word-filters" },
        { title: "Oda Temaları", url: "/dashboard/settings/room-themes" },
      ],
    },
    {
      title: "Sosyal",
      url: "#",
      icon: MessagesSquare,
      children: [
        { title: "Anlar", url: "/dashboard/anlar" },
        { title: "Sıcak Konular", url: "/dashboard/anlar/topics" },
        { title: "Özel Mesajlar", url: "/dashboard/messages" },
        { title: "Hi Mesajları", url: "/dashboard/settings/hi-messages" },
        { title: "Emojiler", url: "/dashboard/emojis" },
      ],
    },
    {
      title: "Gelir & Ekonomi",
      url: "#",
      icon: Wallet,
      children: [
        { title: "Hediyeler", url: "/dashboard/gifts" },
        { title: "Harcama Raporları", url: "/dashboard/reports" },
        { title: "Coin Paketleri", url: "/dashboard/settings/coin-packages" },
        { title: "Hikaye Fiyatları", url: "/dashboard/settings/story-prices" },
        { title: "Komisyon & Fiyatlar", url: "/dashboard/settings/commissions" },
        { title: "Ajans Prim Oranları", url: "/dashboard/settings/agency-prim" },
      ],
    },
    {
      title: "Destek & Bildirim",
      url: "#",
      icon: Headset,
      children: [
        { title: "Bildirimler", url: "/dashboard/notifications" },
        { title: "Şikayet & Öneriler", url: "/dashboard/complaints" },
      ],
    },
    {
      title: "Geliştirici",
      url: "#",
      icon: Code2,
      children: [
        { title: "Endpoints", url: "/dashboard/endpoints" },
        { title: "API Dökümantasyonu", url: "/dashboard/api-docs" },
        { title: "Sistem Logları", url: "/dashboard/system-logs" },
        { title: "Auth Test", url: "/dashboard/auth-test" },
        { title: "Test İstemcisi", url: "/dashboard/rooms/client" },
      ],
    },
    { title: "Ayarlar", url: "/dashboard/settings", icon: Settings },
  ],
}

/** Sayfa, menü adresiyle birebir ya da onun alt yolu (örn. /dashboard/users/12) ise eşleşir. */
function matches(pathname: string, url: string): boolean {
  if (url === "#") return false
  return pathname === url || (url !== "/dashboard" && pathname.startsWith(url + "/"))
}

/** Tüm menüde en uzun eşleşen adres vurgulanır; böylece /rooms/reports'ta /rooms de yanmaz. */
function findActiveUrl(pathname: string): string | null {
  let best: string | null = null
  for (const item of data.navMain) {
    for (const url of [item.url, ...(item.children?.map(c => c.url) ?? [])]) {
      if (matches(pathname, url) && (best === null || url.length > best.length)) best = url
    }
  }
  return best
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { state, setOpen, open } = useSidebar()
  const activeUrl = findActiveUrl(pathname)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }
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
            const active = activeUrl !== null && (item.url === activeUrl || !!item.children?.some(child => child.url === activeUrl))

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
                            <SidebarMenuSubButton asChild isActive={subItem.url === activeUrl}>
                              <Link href={subItem.url} className={cn("whitespace-nowrap transition-colors", subItem.url === activeUrl && "text-primary font-bold")}>
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
                  isActive={item.url === activeUrl}
                  className={cn(
                    "transition-all duration-200",
                    item.url === activeUrl && "bg-primary/5 text-primary border-r-2 border-r-primary rounded-none"
                  )}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon className={cn(item.url === activeUrl && "text-primary")} />}
                    <span className={cn("text-black", item.url === activeUrl && "font-bold text-primary")}>
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
            <div className="flex flex-col text-sm truncate animate-in fade-in duration-300 ml-3 whitespace-nowrap flex-1">
              <span className="font-semibold text-black leading-none">Admin</span>
              <span className="text-muted-foreground text-[10px] mt-1 uppercase tracking-tighter">Lomix Panel</span>
            </div>
          )}
          {open && (
            <button
              onClick={handleLogout}
              className="ml-auto flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
