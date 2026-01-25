"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [date, setDate] = useState<string>('');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        // Kullanıcı bilgisini LocalStorage'dan al
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) { }
        }

        const updateClock = () => {
            const now = new Date();
            setDate(now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }) + ' ' + now.toLocaleTimeString('tr-TR'));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);

        // Dropdown'ı dışarı tıklandığında kapatmak için
        const handleClickOutside = (event: MouseEvent) => {
            if (showDropdown && !(event.target as HTMLElement).closest('.nav-item.dropdown')) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('click', handleClickOutside);

        return () => {
            clearInterval(timer);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showDropdown]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    return (
        <header className="navbar navbar-expand-md navbar-light d-none d-lg-flex d-print-none">
            <div className="container-xl">
                <div className="navbar-nav flex-row order-md-last">
                    <div className="nav-item d-none d-md-flex me-3">
                        <div className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            {date}
                        </div>
                    </div>
                    <div className={`nav-item dropdown ${showDropdown ? 'show' : ''}`}>
                        <a
                            href="#"
                            className={`nav-link d-flex lh-1 text-reset p-0 ${showDropdown ? 'show' : ''}`}
                            onClick={(e) => { e.preventDefault(); setShowDropdown(!showDropdown); }}
                            aria-label="Open user menu"
                            aria-expanded={showDropdown}
                        >
                            <span className="avatar avatar-sm" style={{ backgroundImage: user?.avatar ? `url(${user.avatar})` : 'none' }}>
                                {!user?.avatar && user?.username?.substring(0, 2).toUpperCase()}
                            </span>
                            <div className="d-none d-xl-block ps-2">
                                <div>{user?.username || 'Admin'}</div>
                                <div className="mt-1 small text-muted">{user?.role || 'Admin'}</div>
                            </div>
                        </a>
                        <div
                            className={`dropdown-menu dropdown-menu-end dropdown-menu-arrow ${showDropdown ? 'show' : ''}`}
                            style={{ position: 'absolute', right: 0 }}
                            data-bs-popper={showDropdown ? 'static' : ''}
                        >
                            <a href="/dashboard/profile" className="dropdown-item">Profil</a>
                            <div className="dropdown-divider"></div>
                            <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Çıkış Yap</a>
                        </div>
                    </div>
                </div>
                <div className="collapse navbar-collapse" id="navbar-menu">
                    {/* Buraya Breadcrumb veya başka header elemanları gelebilir */}
                </div>
            </div>
        </header>
    );
}
