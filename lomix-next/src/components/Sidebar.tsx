"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuItem {
    id: string;
    title: string;
    url?: string;
    icon?: string;
    children?: MenuItem[];
}

const STATIC_MENUS: MenuItem[] = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        url: '/dashboard',
        icon: 'ti-home'
    },
    {
        id: 'users',
        title: 'Kullanıcı Yönetimi',
        url: '/dashboard/users',
        icon: 'ti-users'
    },
    {
        id: 'roles',
        title: 'Roller & Yetkiler',
        url: '/dashboard/roles',
        icon: 'ti-shield'
    },
    {
        id: 'content',
        title: 'İçerik Yönetimi',
        icon: 'ti-file-text',
        children: [
            { id: 'endpoints', title: 'Endpoints', url: '/dashboard/endpoints' },
            { id: 'logs', title: 'Sistem Logları', url: '/dashboard/logs' }
        ]
    },
    {
        id: 'settings',
        title: 'Ayarlar',
        url: '/dashboard/settings',
        icon: 'ti-settings'
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const [openMenus, setOpenMenus] = useState<string[]>([]);

    // Sayfa değiştiğinde veya ilk açılışta aktif olan parent'ı açık getir
    useEffect(() => {
        const activeParent = STATIC_MENUS.find(menu => 
            menu.children?.some(child => child.url && pathname.startsWith(child.url))
        );
        if (activeParent && !openMenus.includes(activeParent.id)) {
            setOpenMenus(prev => [...prev, activeParent.id]);
        }
    }, [pathname]);

    const isActive = (url?: string) => {
        if (!url) return false;
        if (url === '/dashboard' && pathname === '/dashboard') return true;
        if (url !== '/dashboard' && pathname.startsWith(url)) return true;
        return false;
    };

    const toggleMenu = (id: string) => {
        if (openMenus.includes(id)) {
            setOpenMenus(openMenus.filter(m => m !== id));
        } else {
            setOpenMenus([...openMenus, id]);
        }
    };

    return (
        <aside className="navbar navbar-vertical navbar-expand-lg">
            <div className="container-fluid">
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#sidebar-menu">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <h1 className="navbar-brand navbar-brand-autodark">
                    <Link href="/dashboard" className="text-decoration-none d-flex align-items-center">
                        <img src="/img/logo.png" alt="Lomix" className="navbar-brand-image" style={{ height: '40px' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        <span className="ms-2 d-flex fw-bold" style={{ fontSize: '24px', letterSpacing: '2px' }}>
                            <span className="text-blue">L</span>
                            <span className="text-red">O</span>
                            <span className="text-yellow">M</span>
                            <span className="text-green">I</span>
                            <span className="text-purple">X</span>
                        </span>
                    </Link>
                </h1>
                <div className="collapse navbar-collapse" id="sidebar-menu">
                    <ul className="navbar-nav pt-lg-3">
                        {STATIC_MENUS.map(menu => {
                            const hasChildren = menu.children && menu.children.length > 0;
                            const isMenuOpen = openMenus.includes(menu.id);

                            return (
                                <li key={menu.id} className={`nav-item ${hasChildren ? 'dropdown' : ''}`}>
                                    {hasChildren ? (
                                        <>
                                            <div
                                                className={`nav-link dropdown-toggle ${isMenuOpen ? 'show' : ''}`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => toggleMenu(menu.id)}
                                            >
                                                <span className="nav-link-icon d-md-none d-lg-inline-block">
                                                    <i className={`ti ${menu.icon || 'ti-circle'}`}></i>
                                                </span>
                                                <span className="nav-link-title">{menu.title}</span>
                                            </div>
                                            <div className={`dropdown-menu ${isMenuOpen ? 'show' : ''}`}>
                                                <div className="dropdown-menu-columns">
                                                    <div className="dropdown-menu-column">
                                                        {menu.children!.map(child => (
                                                            <Link key={child.id} className={`dropdown-item ${isActive(child.url) ? 'active' : ''}`} href={child.url || '#'}>
                                                                {child.title}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <Link
                                            className={`nav-link ${isActive(menu.url) ? 'active' : ''}`}
                                            href={menu.url || '#'}
                                        >
                                            <span className="nav-link-icon d-md-none d-lg-inline-block">
                                                <i className={`ti ${menu.icon || 'ti-circle'}`}></i>
                                            </span>
                                            <span className="nav-link-title">{menu.title}</span>
                                        </Link>
                                    )}
                                </li>
                            );
                        })}

                        <li className="nav-item">
                            <Link className={`nav-link ${isActive('/dashboard/api-docs') ? 'active' : ''}`} href="/dashboard/api-docs">
                                <span className="nav-link-icon d-md-none d-lg-inline-block">
                                    <i className="ti ti-api"></i>
                                </span>
                                <span className="nav-link-title">API Dokümanları</span>
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </aside>
    );
}
