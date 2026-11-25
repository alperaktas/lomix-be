"use client";

import { useEffect, useState } from 'react';
import { Loader2, Check, X, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface Withdrawal {
    id: number;
    diamondAmount: number;
    methodName: string;
    status: 'pending' | 'completed' | 'rejected';
    description: string | null;
    createdAt: string;
    processedAt: string | null;
    user: { id: number; username: string; fullName: string | null; email: string; phone: string | null };
}

const STATUS_LABELS: Record<string, string> = { pending: 'Beklemede', completed: 'Tamamlandı', rejected: 'Reddedildi' };
const FILTERS = [
    { key: '', label: 'Tümü' },
    { key: 'pending', label: 'Bekleyen' },
    { key: 'completed', label: 'Tamamlanan' },
    { key: 'rejected', label: 'Reddedilen' },
];
const fmt = (n: number) => n.toLocaleString('tr-TR');

export default function WithdrawalsPage() {
    const [items, setItems] = useState<Withdrawal[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [status, setStatus] = useState('pending');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [target, setTarget] = useState<{ w: Withdrawal; action: 'complete' | 'reject' } | null>(null);
    const [note, setNote] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/withdrawals?page=${page}${status ? `&status=${status}` : ''}`, { headers });
            const data = await res.json();
            if (!res.ok) { setError(res.status === 401 || res.status === 403 ? 'Oturumun süresi dolmuş olabilir. Çıkış yapıp tekrar giriş yap.' : (data.error || 'Yüklenemedi.')); return; }
            setItems(data.withdrawals || []);
            setCounts(data.counts || {});
            setTotalPages(data.totalPages || 1);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [status, page]);

    const submit = async () => {
        if (!target) return;
        setBusy(true); setError('');
        try {
            const res = await fetch('/api/admin/withdrawals', { method: 'PUT', headers, body: JSON.stringify({ id: target.w.id, action: target.action, description: note }) });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'İşlem yapılamadı.'); return; }
            setTarget(null); setNote('');
            await load();
        } finally { setBusy(false); }
    };

    const total = Object.values(counts).reduce((x, y) => x + y, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Çekim Talepleri</h2>
                <p className="text-muted-foreground max-w-3xl">
                    Kullanıcıların elmas çekim talepleri. Elmas talep anında hesaptan düşer. Ödemeyi yaptıktan sonra <b>Tamamla</b> deyin (isterseniz referans notu yazın, kullanıcı görür).
                    <b> Reddederseniz</b> elmaslar kullanıcıya iade edilir.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {FILTERS.map(f => (
                    <Button key={f.key} size="sm" variant={status === f.key ? 'default' : 'outline'} onClick={() => { setPage(1); setStatus(f.key); }}>
                        {f.label} ({f.key ? counts[f.key] ?? 0 : total})
                    </Button>
                ))}
            </div>

            {error && !target && <p className="text-sm text-rose-600">{error}</p>}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
                    <Wallet className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Bu filtrede çekim talebi yok.</p>
                </div>
            ) : (
                <div className="rounded-xl border overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40"><tr className="border-b">
                            {['Kullanıcı', 'Elmas', 'Yöntem', 'Tarih', 'Durum', ''].map(h => (
                                <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {items.map(w => (
                                <tr key={w.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors align-top">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="font-semibold">{w.user.fullName || w.user.username}</div>
                                        <div className="text-xs text-muted-foreground">#{w.user.id} @{w.user.username}</div>
                                        <div className="text-xs text-muted-foreground">{w.user.phone || w.user.email}</div>
                                    </td>
                                    <td className="px-4 py-4 font-semibold whitespace-nowrap">{fmt(w.diamondAmount)}</td>
                                    <td className="px-4 py-4">{w.methodName}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div>{new Date(w.createdAt).toLocaleString('tr-TR')}</div>
                                        {w.processedAt && <div className="text-xs text-muted-foreground">İşlendi: {new Date(w.processedAt).toLocaleString('tr-TR')}</div>}
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge variant={w.status === 'pending' ? 'default' : 'secondary'}>{STATUS_LABELS[w.status]}</Badge>
                                        {w.description && <div className="text-xs text-muted-foreground mt-1 max-w-[16rem] break-words">{w.description}</div>}
                                    </td>
                                    <td className="px-4 py-4">
                                        {w.status === 'pending' && (
                                            <div className="flex gap-1 justify-end">
                                                <Button size="sm" variant="ghost" className="h-8 px-2 text-emerald-700 hover:bg-emerald-50" onClick={() => { setError(''); setNote(''); setTarget({ w, action: 'complete' }); }}>
                                                    <Check className="h-3.5 w-3.5 mr-1" /> Tamamla
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-8 px-2 text-rose-600 hover:bg-rose-50" onClick={() => { setError(''); setNote(''); setTarget({ w, action: 'reject' }); }}>
                                                    <X className="h-3.5 w-3.5 mr-1" /> Reddet
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Önceki</Button>
                    <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sonraki</Button>
                </div>
            )}

            <Dialog open={!!target} onOpenChange={o => { if (!o) setTarget(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{target?.action === 'complete' ? 'Çekimi Tamamla' : 'Çekimi Reddet'}</DialogTitle>
                        <DialogDescription>
                            {target && (target.action === 'complete'
                                ? `${target.w.user.fullName || target.w.user.username} kullanıcısına ${fmt(target.w.diamondAmount)} elmaslık ödeme yapıldı olarak işaretlensin mi? Kullanıcıya bildirim gider.`
                                : `${fmt(target.w.diamondAmount)} elmas ${target.w.user.fullName || target.w.user.username} kullanıcısına iade edilsin ve talep reddedilsin mi? Kullanıcıya bildirim gider.`)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1 py-1">
                        <label className="text-xs font-semibold text-zinc-700">{target?.action === 'complete' ? 'Referans / not' : 'Red nedeni'} <span className="text-zinc-400 font-normal">(isteğe bağlı, kullanıcı görür)</span></label>
                        <Input value={note} maxLength={200} onChange={e => setNote(e.target.value)} placeholder={target?.action === 'complete' ? 'Örn. Ref: #987654' : 'Örn. Hesap bilgisi hatalı'} />
                    </div>
                    {error && <p className="text-xs text-rose-600">{error}</p>}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setTarget(null)}>İptal</Button>
                        <Button variant={target?.action === 'reject' ? 'destructive' : 'default'} onClick={submit} disabled={busy}>
                            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} {target?.action === 'complete' ? 'Tamamla' : 'Reddet ve İade Et'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
