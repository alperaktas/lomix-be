"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCcw, ArrowLeft, ShieldAlert, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Report = {
    id: number;
    reason: string;
    status: string;
    createdAt: string;
    room: { id: number; roomId: string; name: string; isLive: boolean };
    reporter: { id: number; username: string; avatar: string | null };
};

const STATUS_TABS = ['pending', 'all', 'dismissed', 'actioned'] as const;
const STATUS_LABELS: Record<string, string> = { pending: 'Bekleyen', all: 'Tümü', dismissed: 'Reddedilen', actioned: 'İşlem Yapılan' };

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const router = useRouter();

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/rooms/reports?status=${statusFilter}`, {
                headers: { Authorization: 'Bearer ' + token },
            });
            if (res.ok) setReports(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, [statusFilter]);

    const handleReport = async (reportId: number, status: string, closeRoom = false) => {
        const token = localStorage.getItem('token');
        await fetch(`/api/rooms/reports/${reportId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ status, closeRoom }),
        });
        fetchReports();
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => router.push('/dashboard/rooms')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Oda Raporları</h1>
                    <p className="text-sm text-zinc-500 mt-1">Kullanıcıların bildirdiği uygunsuz oda raporları</p>
                </div>
                <Button variant="outline" size="sm" className="h-9 px-3" onClick={fetchReports} disabled={loading}>
                    <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
            </div>

            {/* Status Filter */}
            <div className="border-b border-zinc-200 flex gap-0">
                {STATUS_TABS.map(tab => (
                    <button key={tab} onClick={() => setStatusFilter(tab)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${statusFilter === tab
                            ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
                        {STATUS_LABELS[tab]}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
            ) : reports.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-zinc-400">
                    <ShieldAlert className="h-8 w-8" />
                    <p className="text-sm">Bu kategoride rapor bulunmuyor.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {reports.map(report => (
                        <div key={report.id} className="rounded-lg border border-zinc-200 bg-white p-4 flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-sm font-bold text-zinc-800">{report.room.name}</span>
                                    {report.room.isLive && (
                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 font-semibold">CANLI</span>
                                    )}
                                    <Badge variant="outline" className={
                                        report.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]' :
                                            report.status === 'actioned' ? 'bg-rose-50 text-rose-700 border-rose-200 text-[10px]' :
                                                'bg-zinc-100 text-zinc-500 border-zinc-200 text-[10px]'
                                    }>
                                        {STATUS_LABELS[report.status] || report.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-zinc-600 mb-1.5">{report.reason}</p>
                                <p className="text-[11px] text-zinc-400">
                                    {report.reporter.username} tarafından · {new Date(report.createdAt).toLocaleDateString('tr-TR')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => router.push(`/dashboard/rooms/${report.room.id}`)}>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                                {report.status === 'pending' && (
                                    <>
                                        <Button variant="outline" size="sm" className="h-7 text-xs"
                                            onClick={() => handleReport(report.id, 'dismissed')}>Reddet</Button>
                                        <Button size="sm" className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                                            onClick={() => handleReport(report.id, 'actioned', true)}>Odayı Kapat</Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
