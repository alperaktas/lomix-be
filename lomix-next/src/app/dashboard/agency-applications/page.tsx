"use client";

import { useEffect, useState } from 'react';
import { Loader2, Building2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Application {
    id: number;
    applicationType: string;
    contactMethod: 'phone' | 'email';
    contactValue: string;
    note: string | null;
    kvkkAcceptedAt: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    user: { id: number; username: string; fullName: string | null };
    agency: { id: number; name: string };
}

const STATUS_LABELS: Record<string, string> = { pending: 'Bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi' };
const FILTERS = [{ key: '', label: 'Tümü' }, { key: 'pending', label: 'Bekleyen' }, { key: 'approved', label: 'Onaylanan' }, { key: 'rejected', label: 'Reddedilen' }];

export default function AgencyApplicationsPage() {
    const [items, setItems] = useState<Application[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [status, setStatus] = useState('pending');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/agency-applications?page=${page}${status ? `&status=${status}` : ''}`, { headers });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Yüklenemedi.'); return; }
            setItems(data.applications || []);
            setCounts(data.counts || {});
            setTotalPages(data.totalPages || 1);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [status, page]);

    const act = async (a: Application, action: 'approve' | 'reject') => {
        const who = a.user.fullName || a.user.username;
        const msg = action === 'approve'
            ? `${who}, "${a.agency.name}" ajansına onaylı üye olarak eklensin mi?`
            : `${who} kullanıcısının "${a.agency.name}" başvurusu reddedilsin mi?`;
        if (!confirm(msg)) return;
        setError(''); setBusyId(a.id);
        try {
            const res = await fetch('/api/admin/agency-applications', { method: 'PUT', headers, body: JSON.stringify({ id: a.id, action }) });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'İşlem yapılamadı.'); return; }
            await load();
        } finally { setBusyId(null); }
    };

    const total = Object.values(counts).reduce((x, y) => x + y, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Ajans Başvuruları</h2>
                <p className="text-muted-foreground">Onay, başvuranı ajansa üye yapar ve kullanıcıya bildirim gönderir.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {FILTERS.map(f => (
                    <Button key={f.key} size="sm" variant={status === f.key ? 'default' : 'outline'} onClick={() => { setPage(1); setStatus(f.key); }}>
                        {f.label} ({f.key ? counts[f.key] ?? 0 : total})
                    </Button>
                ))}
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
                    <Building2 className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Bu filtrede başvuru yok.</p>
                </div>
            ) : (
                <div className="rounded-xl border overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                            <tr className="border-b">
                                {['Başvuran', 'Ajans', 'Tür', 'İletişim', 'Not', 'Tarih', 'Durum', ''].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(a => (
                                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors align-top">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="font-semibold">{a.user.fullName || a.user.username}</div>
                                        <div className="text-xs text-muted-foreground">#{a.user.id} @{a.user.username}</div>
                                    </td>
                                    <td className="px-4 py-4">{a.agency.name}</td>
                                    <td className="px-4 py-4"><Badge variant="secondary">{a.applicationType}</Badge></td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div>{a.contactValue}</div>
                                        <div className="text-xs text-muted-foreground">{a.contactMethod === 'phone' ? 'Telefon' : 'E-posta'}</div>
                                    </td>
                                    <td className="px-4 py-4 max-w-xs break-words">{a.note || <span className="text-muted-foreground">-</span>}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div>{new Date(a.createdAt).toLocaleString('tr-TR')}</div>
                                        <div className="text-xs text-muted-foreground">KVKK: {new Date(a.kvkkAcceptedAt).toLocaleDateString('tr-TR')}</div>
                                    </td>
                                    <td className="px-4 py-4"><Badge variant={a.status === 'pending' ? 'default' : 'secondary'}>{STATUS_LABELS[a.status]}</Badge></td>
                                    <td className="px-4 py-4">
                                        {a.status === 'pending' && (
                                            <div className="flex gap-1 justify-end">
                                                <Button size="sm" variant="ghost" className="h-8 px-2 text-emerald-700 hover:bg-emerald-50" disabled={busyId === a.id} onClick={() => act(a, 'approve')}>
                                                    <Check className="h-3.5 w-3.5 mr-1" /> Onayla
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-8 px-2 text-rose-600 hover:bg-rose-50" disabled={busyId === a.id} onClick={() => act(a, 'reject')}>
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
        </div>
    );
}
