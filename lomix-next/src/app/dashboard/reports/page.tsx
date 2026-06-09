"use client";

import { useEffect, useState } from 'react';
import { Loader2, RefreshCcw, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Transaction {
    id: number;
    amount: number;
    type: string;
    description: string | null;
    createdAt: string;
    fromUser: { id: number; username: string; fullName: string | null; avatar: string | null };
    toUser: { id: number; username: string; fullName: string | null; avatar: string | null } | null;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    admin_coin_add:    { label: 'Admin Ekleme',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    admin_coin_remove: { label: 'Admin Silme',     color: 'bg-rose-50 text-rose-700 border-rose-200' },
    gift:              { label: 'Hediye',           color: 'bg-purple-50 text-purple-700 border-purple-200' },
    story_purchase:    { label: 'Story Satın Alma', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    transfer:          { label: 'Transfer',         color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function ReportsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [userIdFilter, setUserIdFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    const fetchTransactions = async (p = page) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(p) });
            if (userIdFilter) params.set('user_id', userIdFilter);
            if (typeFilter) params.set('type', typeFilter);
            const res = await fetch(`/api/admin/transactions?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setTransactions(data.transactions || []);
            setTotalPages(data.totalPages || 1);
            setTotal(data.total || 0);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchTransactions(1); setPage(1); }, [userIdFilter, typeFilter]);
    useEffect(() => { fetchTransactions(page); }, [page]);

    const UserChip = ({ user }: { user: Transaction['fromUser'] }) => (
        <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar || ''} />
                <AvatarFallback className="text-[10px]">{user.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
                <p className="text-xs font-medium leading-none">{user.fullName || user.username}</p>
                <p className="text-[11px] text-zinc-400">@{user.username}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Harcama Raporları</h2>
                    <p className="text-muted-foreground">Toplam {total.toLocaleString('tr-TR')} işlem</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchTransactions(page)}>
                    <RefreshCcw className="h-4 w-4 mr-2" /> Yenile
                </Button>
            </div>

            {/* Filtreler */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8 w-44" placeholder="Kullanıcı ID" value={userIdFilter} onChange={e => setUserIdFilter(e.target.value)} />
                </div>
                <select
                    className="flex h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                >
                    <option value="">Tüm türler</option>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-20">İşlem bulunamadı.</p>
            ) : (
                <>
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40">
                                <tr className="border-b">
                                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Gönderen</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Alıcı</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tür</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Miktar</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Açıklama</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tarih / Saat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => {
                                    const typeInfo = TYPE_LABELS[t.type] || { label: t.type, color: 'bg-zinc-50 text-zinc-600 border-zinc-200' };
                                    const date = new Date(t.createdAt);
                                    return (
                                        <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3"><UserChip user={t.fromUser} /></td>
                                            <td className="px-4 py-3">{t.toUser ? <UserChip user={t.toUser} /> : <span className="text-zinc-400 text-xs">—</span>}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={`text-xs font-semibold ${typeInfo.color}`}>{typeInfo.label}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`font-bold text-sm ${t.type === 'admin_coin_remove' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {t.type === 'admin_coin_remove' ? '-' : '+'}{t.amount.toLocaleString('tr-TR')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-500 text-xs max-w-[200px] truncate">{t.description || '—'}</td>
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
                        <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
