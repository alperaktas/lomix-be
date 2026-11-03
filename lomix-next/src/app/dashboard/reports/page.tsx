"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCcw, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Person { id: number; username: string; fullName: string | null; avatar: string | null }
interface Row {
    key: string;
    createdAt: string;
    type: string;
    direction: 'in' | 'out';
    amount: number;
    user: Person | null;
    other: Person | null;
    description: string | null;
}
interface Report {
    rows: Row[];
    total: number;
    totalPages: number;
    summary: { loaded: number; spent: number; net: number };
    wallet: { balance: number; diamonds: number } | null;
}

type Kind = 'all' | 'load' | 'spend';
const TABS: { key: Kind; label: string }[] = [
    { key: 'all', label: 'Tüm Hareketler' },
    { key: 'load', label: 'Yükleme Detayları' },
    { key: 'spend', label: 'Harcama Detayları' },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    purchase: { label: 'Coin Satın Alma', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    admin_coin_add: { label: 'Admin Ekleme', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    exchange: { label: 'Elmas Bozdurma', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    message_refund: { label: 'Mesaj İadesi', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    admin_coin_remove: { label: 'Admin Silme', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    gift: { label: 'Hediye', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    story_purchase: { label: 'Hikaye', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    message: { label: 'Mesaj Ücreti', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const fmt = (n: number) => n.toLocaleString('tr-TR');

function PersonChip({ person }: { person: Person | null }) {
    if (!person) return <span className="text-zinc-400 text-xs">—</span>;
    return (
        <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
                <AvatarImage src={person.avatar || ''} />
                <AvatarFallback className="text-[10px]">{person.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
                <p className="text-xs font-medium leading-none">{person.fullName || person.username}</p>
                <p className="text-[11px] text-zinc-400">@{person.username} · #{person.id}</p>
            </div>
        </div>
    );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
    return (
        <div className="rounded-lg border bg-white p-4">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</div>
            <div className={`text-xl font-bold mt-1 ${tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : 'text-zinc-900'}`}>{value}</div>
        </div>
    );
}

export default function CoinReportsPage() {
    const [kind, setKind] = useState<Kind>('all');
    const [userIdFilter, setUserIdFilter] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [page, setPage] = useState(1);
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ready, setReady] = useState(false);
    const lastFilter = useRef('');

    // Kullanıcı detayından gelen ?user_id= bağlantısı.
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('user_id');
        if (id && /^\d+$/.test(id)) setUserIdFilter(id);
        setReady(true);
    }, []);

    const load = async (p: number) => {
        setLoading(true); setError('');
        try {
            const params = new URLSearchParams({ page: String(p), kind });
            if (userIdFilter.trim()) params.set('user_id', userIdFilter.trim());
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            const res = await fetch(`/api/admin/coin-report?${params}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const json = await res.json();
            if (!res.ok) { setError(json.error || 'Rapor yüklenemedi.'); setReport(null); return; }
            setReport(json);
        } catch { setError('Bağlantı hatası.'); }
        finally { setLoading(false); }
    };

    // Filtre değişince ilk sayfadan başla (yazarken istek yağmasın diye kısa gecikmeyle); sayfa değişince aynı filtreyle devam et.
    const filterKey = `${kind}|${userIdFilter}|${from}|${to}`;
    useEffect(() => {
        if (!ready) return;
        const filterChanged = lastFilter.current !== filterKey;
        lastFilter.current = filterKey;
        if (filterChanged && page !== 1) { setPage(1); return; }
        const t = setTimeout(() => load(page), filterChanged ? 250 : 0);
        return () => clearTimeout(t);
    }, [ready, filterKey, page]);

    const summary = report?.summary;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Coin Raporları</h2>
                    <p className="text-muted-foreground">
                        {userIdFilter.trim() ? `Kullanıcı #${userIdFilter.trim()}` : 'Tüm kullanıcılar'} · {fmt(report?.total ?? 0)} hareket
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => load(page)}>
                    <RefreshCcw className="h-4 w-4 mr-2" /> Yenile
                </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
                {TABS.map(t => (
                    <Button key={t.key} size="sm" variant={kind === t.key ? 'default' : 'outline'} onClick={() => setKind(t.key)}>{t.label}</Button>
                ))}
            </div>

            <div className="flex gap-3 flex-wrap items-center">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8 w-44" inputMode="numeric" placeholder="Kullanıcı ID" value={userIdFilter}
                        onChange={e => setUserIdFilter(e.target.value.replace(/\D/g, ''))} />
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">Başlangıç
                    <Input className="w-40" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">Bitiş
                    <Input className="w-40" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} />
                </label>
                {(from || to) && <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); }}>Tarihi temizle</Button>}
            </div>

            {summary && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="Yüklenen coin" value={fmt(summary.loaded)} tone="good" />
                    <Stat label="Harcanan coin" value={fmt(summary.spent)} tone="bad" />
                    <Stat label="Fark" value={`${summary.net > 0 ? '+' : ''}${fmt(summary.net)}`} />
                    {report?.wallet && <Stat label="Güncel bakiye" value={`${fmt(report.wallet.balance)} coin · ${fmt(report.wallet.diamonds)} elmas`} />}
                </div>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : !report || report.rows.length === 0 ? (
                <p className="text-center text-muted-foreground py-20">Hareket bulunamadı.</p>
            ) : (
                <>
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40">
                                <tr className="border-b">
                                    {['Kullanıcı', 'Karşı taraf', 'Tür', 'Miktar', 'Açıklama', 'Tarih / Saat'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {report.rows.map(r => {
                                    const info = TYPE_LABELS[r.type] || { label: r.type, color: 'bg-zinc-50 text-zinc-600 border-zinc-200' };
                                    const date = new Date(r.createdAt);
                                    return (
                                        <tr key={r.key} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3"><PersonChip person={r.user} /></td>
                                            <td className="px-4 py-3"><PersonChip person={r.other} /></td>
                                            <td className="px-4 py-3"><Badge variant="outline" className={`text-xs font-semibold ${info.color}`}>{info.label}</Badge></td>
                                            <td className="px-4 py-3">
                                                <span className={`font-bold text-sm ${r.direction === 'out' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {r.direction === 'out' ? '-' : '+'}{fmt(r.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-500 text-xs max-w-[220px] truncate" title={r.description || ''}>{r.description || '—'}</td>
                                            <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                                                {date.toLocaleDateString('tr-TR')}
                                                <br />
                                                <span className="text-zinc-400">{date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">{page} / {report.totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= report.totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
