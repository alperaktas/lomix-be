"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuItem {
    id: number;
    title: string;
    url?: string;
    icon?: string;
    parentId?: number | null;
    children?: MenuItem[];
}

export default function Sidebar() {
    const [menus, setMenus] = useState<MenuItem[]>([]);
    const [openMenus, setOpenMenus] = useState<number[]>([]); // Açık olan dropdown ID'leri
    const pathname = usePathname();

    useEffect(() => {
        const fetchMenus = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const res = await fetch('/api/menus', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (res.ok) {
                    const data: MenuItem[] = await res.json();
                    const tree = buildMenuTree(data);
                    setMenus(tree);
                }
            } catch (err) {
                console.error("Menü yüklenemedi", err);
            }
        };

        fetchMenus();
    }, []);

    const buildMenuTree = (flatMenus: MenuItem[]) => {
        const map: { [key: number]: MenuItem } = {};
        const tree: MenuItem[] = [];

        flatMenus.forEach(m => {
            map[m.id] = { ...m, children: [] };
        });

        // Prisma'da düz array dönerse (parent include yoksa)
        flatMenus.forEach(m => {
            if (m.parentId && map[m.parentId]) {
                map[m.parentId].children!.push(map[m.id]);
            } else {
                // Sadece root elemanları tree'ye ekle
                if (!m.parentId) tree.push(map[m.id]);
            }
        });
        return tree;
    };

    const toggleMenu = (id: number) => {
        if (openMenus.includes(id)) {
            setOpenMenus(openMenus.filter(m => m !== id));
        } else {
            setOpenMenus([...openMenus, id]);
        }
    };

    const isActive = (url?: string) => {
        if (!url) return false;
        if (url === '/' && pathname === '/dashboard') return true;
        return pathname.startsWith(url);
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
                        {menus.map(menu => {
                            const hasChildren = menu.children && menu.children.length > 0;
                            const isOpen = openMenus.includes(menu.id);

                            return (
                                <li key={menu.id} className={`nav-item ${hasChildren ? 'dropdown' : ''}`}>
                                    <Link
                                        className={`nav-link ${hasChildren ? 'dropdown-toggle' : ''} ${isActive(menu.url) ? 'active' : ''} ${isOpen ? 'show' : ''}`}
                                        href={hasChildren ? '#navbar-' + menu.id : (menu.url === '/dashboard' ? '/dashboard' : menu.url || '#')}
                                        role="button"
                                        aria-expanded={isOpen}
                                        onClick={(e) => {
                                            if (hasChildren) {
                                                e.preventDefault();
                                                toggleMenu(menu.id);
                                            }
                                        }}
                                    >
                                        <span className="nav-link-icon d-md-none d-lg-inline-block">
                                            {menu.icon && menu.icon.startsWith('fa-') ? (
                                                <i className={`fas ${menu.icon} me-2`}></i>
                                            ) : (
                                                <i className={`ti ${menu.icon || 'ti-circle'}`}></i>
                                            )}
                                        </span>
                                        <span className="nav-link-title">{menu.title}</span>
                                    </Link>

                                    {hasChildren && (
                                        <div className={`dropdown-menu ${isOpen ? 'show' : ''}`} data-bs-popper={isOpen ? "static" : ""}>
                                            {menu.children!.map(child => (
                                                <Link key={child.id} className={`dropdown-item ${isActive(child.url) ? 'active' : ''}`} href={child.url || '#'}>
                                                    {child.title}
                                                </Link>
                                            ))}
                                        </div>
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
