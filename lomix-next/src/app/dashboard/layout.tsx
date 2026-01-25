"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.replace('/');
        } else {
            setIsAuthorized(true);
        }
    }, [router]);

    if (!isAuthorized) {
        return <div className="page-center p-5 text-center">Yönlendiriliyorsunuz...</div>;
    }

    return (
        <div className="page">
            <Sidebar />
            <div className="page-wrapper">
                <Header />
                <div className="page-body">
                    <div className="container-xl">
                        {children}
                    </div>
                </div>
                <footer className="footer footer-transparent d-print-none">
                    <div className="container-xl">
                        <div className="row text-center align-items-center flex-row-reverse">
                            <div className="col-12 col-lg-auto mt-3 mt-lg-0">
                                <ul className="list-inline list-inline-dots mb-0">
                                    <li className="list-inline-item">
                                        Copyright &copy; {new Date().getFullYear()}
                                        <a href="." className="link-secondary ms-1">Lomix Admin</a>.
                                        Tüm hakları saklıdır.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
