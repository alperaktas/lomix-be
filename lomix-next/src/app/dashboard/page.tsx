"use client";

import React, { useEffect, useState } from 'react';

import {
    IconMailForward,
    IconCheck,
    IconAlertCircle,
    IconUsers,
    IconHierarchy,
    IconShieldLock,
    IconRefresh
} from '@tabler/icons-react';

export default function DashboardPage() {
    const [stats, setStats] = useState<any>({
        userStats: { total: 0, active: 0, pending: 0, totalGroups: 0, totalRoles: 0 },
        system: { cpu: { load: 0 }, mem: { usage: 0, used: 0, total: 0 }, uptime: 0 },
        queue: { waiting: 0, completed: 142, failed: 2 }
    });

    const fetchAllStats = async () => {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': 'Bearer ' + token };

        try {
            // 1. Kullanıcı ve Genel İstatistikler
            const uRes = await fetch('/api/users/stats', { headers });
            const uData = await uRes.json();

            // 2. Sistem İstatistikleri
            const sRes = await fetch('/api/system/stats', { headers });
            const sData = await sRes.json();

            // Ek bilgi: Grup ve Rol sayılarını çekmek için
            const gRes = await fetch('/api/groups', { headers });
            const groups = await gRes.json();
            const rRes = await fetch('/api/roles', { headers });
            const roles = await rRes.json();

            // 3. Kuyruk İstatistikleri
            const qRes = await fetch('/api/mobile/queue-status', { headers });
            const qData = await qRes.json();

            setStats({
                userStats: { ...uData, totalGroups: groups.length || 0, totalRoles: roles.length || 0 },
                system: sData,
                queue: qData
            });

        } catch (error) {
            console.error("Dashboard verileri çekilemedi", error);
        }
    };

    useEffect(() => {
        fetchAllStats();
        const interval = setInterval(fetchAllStats, 10000); // 10 saniyede bir güncelle
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        let parts = [];
        if (d > 0) parts.push(`${d}g`);
        if (h > 0) parts.push(`${h}s`);
        if (m > 0) parts.push(`${m}dk`);
        return parts.join(' ') || '< 1dk';
    };

    return (
        <div className="container-xl">
            <div className="page-header d-print-none mb-4">
                <div className="row g-2 align-items-center">
                    <div className="col">
                        <div className="page-pretitle">Genel Bakış</div>
                        <h2 className="page-title">Dashboard</h2>
                    </div>
                    <div className="col-auto ms-auto">
                        <button className="btn btn-primary" onClick={fetchAllStats}>
                            <IconRefresh size={18} className="me-2" />
                            Yenile
                        </button>
                    </div>
                </div>
            </div>

            <div className="row row-cards">
                {/* --- EMAIL KUYRUK KARTLARI --- */}
                <div className="col-md-4">
                    <div className="card card-sm bg-primary-lt">
                        <div className="card-body">
                            <div className="row align-items-center">
                                <div className="col-auto"><span className="bg-primary text-white avatar"><IconMailForward /></span></div>
                                <div className="col">
                                    <div className="font-weight-medium">{stats.queue.waiting}</div>
                                    <div className="text-muted">Bekleyen Mailler</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card card-sm bg-success-lt">
                        <div className="card-body">
                            <div className="row align-items-center">
                                <div className="col-auto"><span className="bg-success text-white avatar"><IconCheck /></span></div>
                                <div className="col">
                                    <div className="font-weight-medium">{stats.queue.completed}</div>
                                    <div className="text-muted">Tamamlanan</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card card-sm bg-danger-lt">
                        <div className="card-body">
                            <div className="row align-items-center">
                                <div className="col-auto"><span className="bg-danger text-white avatar"><IconAlertCircle /></span></div>
                                <div className="col">
                                    <div className="font-weight-medium">{stats.queue.failed}</div>
                                    <div className="text-muted">Hatalı</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- SUNUCU DURUMU --- */}
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-body">
                            <div className="subheader">CPU Kullanımı</div>
                            <div className="h3 m-0">{stats.system.cpu.load}%</div>
                            <div className="progress progress-sm mt-3">
                                <div className="progress-bar bg-blue" style={{ width: stats.system.cpu.load + '%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-body">
                            <div className="subheader">RAM Kullanımı</div>
                            <div className="h3 m-0">{stats.system.mem.usage}%</div>
                            <div className="text-muted small">{stats.system.mem.used} GB / {stats.system.mem.total} GB</div>
                            <div className="progress progress-sm mt-3">
                                <div className="progress-bar bg-purple" style={{ width: stats.system.mem.usage + '%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-body">
                            <div className="subheader">Çalışma Süresi</div>
                            <div className="h3 m-0">{formatUptime(stats.system.uptime)}</div>
                            <p className="text-muted small mt-2">Sunucu kesintisiz çalışıyor.</p>
                        </div>
                    </div>
                </div>

                {/* --- GENEL İSTATİSTİKLER --- */}
                <div className="col-md-4">
                    <div className="card bg-azure-lt">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <IconUsers className="me-2 text-azure" />
                                <div className="subheader">Toplam Üye</div>
                            </div>
                            <div className="h1 mb-0">{stats.userStats.total || 0}</div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card bg-indigo-lt">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <IconHierarchy className="me-2 text-indigo" />
                                <div className="subheader">Toplam Grup</div>
                            </div>
                            <div className="h1 mb-0">{stats.userStats.totalGroups}</div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card bg-orange-lt">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <IconShieldLock className="me-2 text-orange" />
                                <div className="subheader">Toplam Rol</div>
                            </div>
                            <div className="h1 mb-0">{stats.userStats.totalRoles}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
