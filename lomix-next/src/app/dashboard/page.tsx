"use client";

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Layers, 
  ShieldCheck, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Database, 
  Clock,
  RefreshCw
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    const [stats, setStats] = useState<any>({
        userStats: { total: 0, active: 0, pending: 0, totalGroups: 0, totalRoles: 0 },
        system: { cpu: { load: 0 }, mem: { usage: 0, used: 0, total: 0 }, uptime: 0 },
        queue: { waiting: 0, completed: 0, failed: 0 }
    });
    const [loading, setLoading] = useState(true);

    const fetchAllStats = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': 'Bearer ' + token };

        try {
            const [uRes, sRes, gRes, rRes, qRes] = await Promise.all([
                fetch('/api/users/stats', { headers }),
                fetch('/api/system/stats', { headers }),
                fetch('/api/groups', { headers }),
                fetch('/api/roles', { headers }),
                fetch('/api/mobile/queue-status', { headers })
            ]);

            const [uData, sData, groups, roles, qData] = await Promise.all([
                uRes.json(),
                sRes.json(),
                gRes.json(),
                rRes.json(),
                qRes.json()
            ]);

            setStats({
                userStats: { ...uData, totalGroups: groups.length || 0, totalRoles: roles.length || 0 },
                system: sData,
                queue: qData
            });
        } catch (error) {
            console.error("Dashboard verileri çekilemedi", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllStats();
        const interval = setInterval(fetchAllStats, 15000); 
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
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Genel Bakış</h2>
                    <p className="text-muted-foreground">Sisteminizin anlık durumu ve kullanıcı istatistikleri.</p>
                </div>
                <Button onClick={fetchAllStats} disabled={loading} variant="outline" className="w-fit">
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Verileri Yenile
                </Button>
            </div>

            {/* --- MAIL KUYRUK ÖZETİ --- */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-blue-500 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bekleyen Mailler</CardTitle>
                        <Mail className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.queue.waiting}</div>
                        <p className="text-xs text-muted-foreground">Gönderilmeyi bekleyen ileti sayısı.</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{stats.queue.completed}</div>
                        <p className="text-xs text-muted-foreground">Başarıyla iletilen mailler.</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-rose-500 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Hatalı Gönderim</CardTitle>
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600">{stats.queue.failed}</div>
                        <p className="text-xs text-muted-foreground">İletilemeyen hata logları.</p>
                    </CardContent>
                </Card>
            </div>

            {/* --- SİSTEM SAĞLIĞI & KAYNAKLAR --- */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium">CPU Yükü</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-3xl font-bold">{stats.system.cpu.load}%</div>
                        <Progress value={stats.system.cpu.load} className="h-2" />
                        <p className="text-[11px] text-muted-foreground">İşlemci anlık kullanım oranı.</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium">Bellek (RAM)</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-baseline justify-between">
                            <div className="text-3xl font-bold">{stats.system.mem.usage}%</div>
                            <span className="text-xs text-muted-foreground">{stats.system.mem.used} GB / {stats.system.mem.total} GB</span>
                        </div>
                        <Progress value={stats.system.mem.usage} className="h-2 bg-muted transition-all" />
                        <p className="text-[11px] text-muted-foreground">Sistem belleği doluluk oranı.</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium">Çalışma Süresi</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col justify-center h-[96px]">
                        <div className="text-2xl font-bold text-primary">{formatUptime(stats.system.uptime)}</div>
                        <p className="text-[11px] text-muted-foreground mt-2">Sunucunun son yeniden başlatmadan beri geçen süresi.</p>
                    </CardContent>
                </Card>
            </div>

            {/* --- TEMEL VARLIKLAR --- */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary/5 border-none shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Toplam Üye</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black tracking-tighter text-primary">{stats.userStats.total || 0}</div>
                        <CardDescription className="mt-1">Kayıtlı sistem kullanıcısı</CardDescription>
                    </CardContent>
                </Card>

                <Card className="bg-indigo-500/5 border-none shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Toplam Grup</CardTitle>
                        <Layers className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black tracking-tighter text-indigo-600">{stats.userStats.totalGroups}</div>
                        <CardDescription className="mt-1">Tanımlı organizasyon grubu</CardDescription>
                    </CardContent>
                </Card>

                <Card className="bg-orange-500/5 border-none shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Tanımlı Roller</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black tracking-tighter text-orange-600">{stats.userStats.totalRoles}</div>
                        <CardDescription className="mt-1">Yetkilendirme şablonu</CardDescription>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
