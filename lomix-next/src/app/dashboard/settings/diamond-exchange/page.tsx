"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Diamond, Coins, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface Item { id: number; coins: number; diamonds: number; isActive: boolean }

const fmt = (n: number) => n.toLocaleString('tr-TR');
/** 1 elmas = kaç coin (en fazla 4 ondalık). */
const rate = (coins: number, diamonds: number) => (coins / diamonds).toLocaleString('tr-TR', { maximumFractionDigits: 4 });

export default function DiamondExchangePage() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editTarget, setEditTarget] = useState<Item | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
    const [form, setForm] = useState({ coins: '', diamonds: '' });
    const [error, setError] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/diamond-shop?type=exchange', { headers });
            const data = await res.json();
            setItems(data.items || []);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const coins = Number(form.coins), diamonds = Number(form.diamonds);
    const valid = form.coins !== '' && form.diamonds !== '' && Number.isInteger(coins) && Number.isInteger(diamonds) && coins >= 1 && diamonds >= 1;

    const send = async (method: string, body: unknown, query = '') => {
        const res = await fetch(`/api/admin/diamond-shop${query}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        const data = await res.json();
        return { ok: res.ok, data };
    };

    const save = async () => {
        setError(''); setSaving(true);
        try {
            const r = editTarget
                ? await send('PUT', { id: editTarget.id, coins, diamonds })
                : await send('POST', { type: 'exchange', coins, diamonds });
            if (!r.ok) { setError(r.data.error || 'Kaydedilemedi.'); return; }
            setAddOpen(false); setEditTarget(null);
            load();
        } finally { setSaving(false); }
    };

    const toggle = async (item: Item) => {
        setError('');
        const r = await send('PUT', { id: item.id, isActive: !item.isActive });
        if (!r.ok) { setError(r.data.error || 'Güncellenemedi.'); return; }
        load();
    };

    const remove = async () => {
        if (!deleteTarget) return;
        setSaving(true); setError('');
        try {
            const r = await send('DELETE', undefined, `?id=${deleteTarget.id}`);
            if (!r.ok) { setError(r.data.error || 'Silinemedi.'); return; }
            setDeleteTarget(null);
            load();
        } finally { setSaving(false); }
    };

    const activeCount = items.filter(i => i.isActive).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Elmas Değişimi</h2>
                    <p className="text-muted-foreground max-w-2xl">
                        Kullanıcılar elmaslarını burada tanımladığınız paketlerle coin'e çevirir. Her paket için kaç coin verileceğini ve karşılığında kaç elmas alınacağını girin.
                        <b> Aktif paket yoksa bozdurma yapılamaz.</b> Kullanıcıya göre kapatmak için kullanıcı detayındaki "Cüzdan İşlemleri"ni kullanın.
                    </p>
                </div>
                <Button onClick={() => { setForm({ coins: '', diamonds: '' }); setError(''); setEditTarget(null); setAddOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Paket Ekle
                </Button>
            </div>

            {error && !addOpen && !editTarget && !deleteTarget && <p className="text-sm text-rose-600">{error}</p>}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
                <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground max-w-3xl">
                    <p className="font-semibold text-foreground">Henüz bozdurma paketi yok</p>
                    <p className="text-sm mt-1">Paket eklenene kadar mobilde elmas coin'e çevrilemez.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{items.length} paket, {activeCount} aktif</p>
                    <div className="rounded-xl border overflow-x-auto max-w-3xl">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40"><tr className="border-b">
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Paket</th>
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Oran</th>
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Durum</th>
                                <th className="px-5 py-3" />
                            </tr></thead>
                            <tbody>
                                {items.map(i => (
                                    <tr key={i.id} className="border-b last:border-0 hover:bg-muted/20">
                                        <td className="px-5 py-4">
                                            <span className="flex items-center gap-2 font-semibold whitespace-nowrap">
                                                <Diamond className="h-3.5 w-3.5 text-sky-600" /> {fmt(i.diamonds)} elmas
                                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                <Coins className="h-3.5 w-3.5 text-amber-600" /> {fmt(i.coins)} coin
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">1 elmas = {rate(i.coins, i.diamonds)} coin</td>
                                        <td className="px-5 py-4">
                                            <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => toggle(i)} title="Tıklayınca durumu değiştirir">
                                                <Badge variant="outline" className={i.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}>
                                                    {i.isActive ? 'Aktif' : 'Pasif'}
                                                </Badge>
                                            </Button>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setForm({ coins: String(i.coins), diamonds: String(i.diamonds) }); setError(''); setEditTarget(i); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle</Button>
                                                <Button variant="ghost" size="sm" className="h-8 px-2 text-rose-600 hover:bg-rose-50" onClick={() => { setError(''); setDeleteTarget(i); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Sil</Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Dialog open={addOpen || !!editTarget} onOpenChange={o => { if (!o) { setAddOpen(false); setEditTarget(null); } }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editTarget ? 'Paketi Düzenle' : 'Paket Ekle'}</DialogTitle>
                        <DialogDescription>Kullanıcı gereken elmasın tamamını verir, karşılığında coin alır.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Kazanılan coin</label>
                            <Input type="number" min="1" step="1" placeholder="Örn. 500" value={form.coins} onChange={e => setForm(f => ({ ...f, coins: e.target.value }))} /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Gereken elmas</label>
                            <Input type="number" min="1" step="1" placeholder="Örn. 1000" value={form.diamonds} onChange={e => setForm(f => ({ ...f, diamonds: e.target.value }))} /></div>
                        {valid && <p className="text-xs text-muted-foreground">{fmt(diamonds)} elmas → {fmt(coins)} coin (1 elmas = {rate(coins, diamonds)} coin)</p>}
                        {error && <p className="text-xs text-rose-600">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setAddOpen(false); setEditTarget(null); }}>İptal</Button>
                        <Button onClick={save} disabled={saving || !valid}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Paketi Sil</DialogTitle>
                        <DialogDescription>{deleteTarget && `${fmt(deleteTarget.diamonds)} elmas → ${fmt(deleteTarget.coins)} coin paketi silinsin mi? Geçmiş işlemler etkilenmez, bu paket mobilde artık görünmez. Geçici olarak kapatmak için "Pasif" yapabilirsiniz.`}</DialogDescription>
                    </DialogHeader>
                    {error && <p className="text-xs text-rose-600">{error}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={remove} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
