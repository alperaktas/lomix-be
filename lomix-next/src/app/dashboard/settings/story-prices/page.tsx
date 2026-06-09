"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface StoryPrice {
    id: number;
    durationHours: number;
    cost: number;
    label: string;
}

const emptyForm = { durationHours: '', cost: '', label: '' };

export default function StoryPricesPage() {
    const [prices, setPrices] = useState<StoryPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<StoryPrice | null>(null);
    const [editTarget, setEditTarget] = useState<StoryPrice | null>(null);
    const [addDialog, setAddDialog] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    const fetchPrices = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/story-prices', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setPrices(data.prices || []);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchPrices(); }, []);

    const openAdd = () => { setForm(emptyForm); setError(''); setAddDialog(true); };
    const openEdit = (p: StoryPrice) => { setForm({ durationHours: String(p.durationHours), cost: String(p.cost), label: p.label }); setError(''); setEditTarget(p); };

    const save = async () => {
        setError('');
        if (!form.durationHours || !form.cost || !form.label.trim()) {
            setError('Tüm alanlar zorunludur.'); return;
        }
        setSaving(true);
        try {
            const isEdit = !!editTarget;
            const res = await fetch('/api/admin/story-prices', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ...(isEdit && { id: editTarget.id }),
                    durationHours: Number(form.durationHours),
                    cost: Number(form.cost),
                    label: form.label.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Bir hata oluştu.'); return; }
            setAddDialog(false); setEditTarget(null);
            fetchPrices();
        } finally { setSaving(false); }
    };

    const deletePrice = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            await fetch(`/api/admin/story-prices?id=${deleteTarget.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setDeleteTarget(null);
            fetchPrices();
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Hikaye Fiyatları</h2>
                    <p className="text-muted-foreground">Hikaye sürelerine göre coin maliyetlerini belirleyin.</p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="h-4 w-4 mr-2" /> Yeni Fiyat
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : prices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                    <Coins className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Henüz fiyat tanımlanmamış.</p>
                    <Button variant="outline" size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Fiyat Ekle</Button>
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                            <tr className="border-b">
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Süre</th>
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Etiket</th>
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Coin</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {prices.map(p => (
                                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="px-5 py-4 font-semibold">{p.durationHours} saat</td>
                                    <td className="px-5 py-4">
                                        <Badge variant="secondary">{p.label}</Badge>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="flex items-center gap-1.5 font-bold text-amber-600">
                                            <Coins className="h-3.5 w-3.5" /> {p.cost.toLocaleString('tr-TR')}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-zinc-600" onClick={() => openEdit(p)}>
                                                <Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => setDeleteTarget(p)}>
                                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Ekle / Düzenle Dialog */}
            <Dialog open={addDialog || !!editTarget} onOpenChange={open => { if (!open) { setAddDialog(false); setEditTarget(null); } }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editTarget ? 'Fiyatı Düzenle' : 'Yeni Fiyat Ekle'}</DialogTitle>
                        <DialogDescription>Hikaye süresi ve coin maliyetini belirleyin.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700">Süre (saat)</label>
                            <Input type="number" min="1" placeholder="ör. 24" value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700">Etiket</label>
                            <Input placeholder="ör. 24 Saat" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700">Coin Maliyeti</label>
                            <Input type="number" min="0" placeholder="ör. 2000" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
                        </div>
                        {error && <p className="text-xs text-rose-600">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setAddDialog(false); setEditTarget(null); }}>İptal</Button>
                        <Button onClick={save} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sil Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Fiyatı Sil</DialogTitle>
                        <DialogDescription>
                            <strong>{deleteTarget?.label}</strong> fiyatını silmek istediğinizden emin misiniz?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={deletePrice} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
