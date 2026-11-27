"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Method { type: string; label: string; isActive: boolean }

/** Uygulamanın özel ikonla gösterdiği türler; diğerleri genel ikonla görünür. */
const KNOWN_TYPES: Record<string, string> = {
    credit_card: 'Kart ikonu',
    gpay: 'Ödeme ikonu',
    wire_transfer: 'Banka ikonu',
};

export default function PaymentMethodsPage() {
    const [items, setItems] = useState<Method[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/payment-methods', { headers });
            const data = await res.json();
            if (!res.ok) { setError(res.status === 401 || res.status === 403 ? 'Oturumun süresi dolmuş olabilir. Çıkış yapıp tekrar giriş yap.' : (data.error || 'Yüklenemedi.')); return; }
            setItems(data.methods || []);
            setDirty(false);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const change = (next: Method[]) => { setItems(next); setDirty(true); setNotice(''); setError(''); };
    const update = (i: number, patch: Partial<Method>) => change(items.map((m, x) => (x === i ? { ...m, ...patch } : m)));
    const move = (i: number, d: -1 | 1) => {
        const j = i + d;
        if (j < 0 || j >= items.length) return;
        const next = [...items];
        [next[i], next[j]] = [next[j], next[i]];
        change(next);
    };

    const save = async () => {
        setSaving(true); setError(''); setNotice('');
        try {
            const res = await fetch('/api/admin/payment-methods', { method: 'PUT', headers, body: JSON.stringify({ methods: items }) });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Kaydedilemedi.'); return; }
            setItems(data.methods); setDirty(false); setNotice('Kaydedildi. Uygulamada coin satın alma ekranında bu sırayla görünür.');
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Ödeme Yöntemleri</h2>
                <p className="text-muted-foreground max-w-3xl">
                    Coin satın alma ekranında gösterilen ödeme yöntemleri. Pasif olanlar uygulamada görünmez, sıra buradaki sıradır.
                    Bu sayfa yalnızca listeyi yönetir; ödemenin gerçekten alınması için yöntemin uygulamada desteklenmesi gerekir.
                </p>
            </div>

            {notice && <p className="text-sm text-emerald-700">{notice}</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="space-y-3 max-w-4xl">
                    {items.length === 0 && (
                        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">Ödeme yöntemi yok. Uygulamada hiçbir yöntem görünmez.</div>
                    )}
                    {items.map((m, i) => (
                        <div key={i} className="rounded-xl border p-3 flex flex-wrap items-end gap-3">
                            <div className="space-y-1 w-44">
                                <label className="text-xs font-semibold text-zinc-700">Tür (kod)</label>
                                <Input list="payment-types" value={m.type} onChange={e => update(i, { type: e.target.value })} placeholder="credit_card" />
                                <p className="text-[11px] text-muted-foreground">{KNOWN_TYPES[m.type] ?? 'Genel ikon'}</p>
                            </div>
                            <div className="space-y-1 flex-1 min-w-[14rem]">
                                <label className="text-xs font-semibold text-zinc-700">Görünen ad</label>
                                <Input value={m.label} maxLength={60} onChange={e => update(i, { label: e.target.value })} placeholder="Kredi Kartı ile Ödeme" />
                                <p className="text-[11px] text-muted-foreground">&nbsp;</p>
                            </div>
                            <div className="flex items-center gap-1 pb-5">
                                <Button variant="ghost" size="sm" className="h-8 px-1" onClick={() => update(i, { isActive: !m.isActive })} title="Tıklayınca durumu değiştirir">
                                    <Badge variant="outline" className={m.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}>
                                        {m.isActive ? 'Aktif' : 'Pasif'}
                                    </Badge>
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={i === 0} onClick={() => move(i, -1)} title="Yukarı"><ArrowUp className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={i === items.length - 1} onClick={() => move(i, 1)} title="Aşağı"><ArrowDown className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50" onClick={() => change(items.filter((_, x) => x !== i))} title="Sil"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    ))}
                    <datalist id="payment-types">
                        {Object.keys(KNOWN_TYPES).map(t => <option key={t} value={t} />)}
                    </datalist>
                    <div className="flex flex-wrap gap-2 pt-1">
                        <Button variant="outline" disabled={items.length >= 10} onClick={() => change([...items, { type: '', label: '', isActive: true }])}><Plus className="h-4 w-4 mr-2" /> Yöntem Ekle</Button>
                        <Button onClick={save} disabled={saving || !dirty}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Kaydet</Button>
                        {dirty && <Button variant="ghost" onClick={load}>Vazgeç</Button>}
                    </div>
                </div>
            )}
        </div>
    );
}
