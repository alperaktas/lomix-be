"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Coins, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface Threshold {
    id: number;
    level: number;
    requiredSpend: number;
    name: string | null;
}

const emptyForm = { level: '', requiredSpend: '', name: '' };

export default function LevelsPage() {
    const [thresholds, setThresholds] = useState<Threshold[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Threshold | null>(null);
    const [editTarget, setEditTarget] = useState<Threshold | null>(null);
    const [addDialog, setAddDialog] = useState(false);
    const [recalcDialog, setRecalcDialog] = useState(false);
    const [backfill, setBackfill] = useState(false);
    const [recalcResult, setRecalcResult] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const fetchThresholds = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/levels', { headers });
            const data = await res.json();
            setThresholds(data.thresholds || []);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchThresholds(); }, []);

    const openAdd = () => {
        const next = thresholds.length ? Math.max(...thresholds.map(t => t.level)) + 1 : 1;
        setForm({ ...emptyForm, level: String(next) });
        setError(''); setAddDialog(true);
    };
    const openEdit = (t: Threshold) => {
        setForm({ level: String(t.level), requiredSpend: String(t.requiredSpend), name: t.name || '' });
        setError(''); setEditTarget(t);
    };

    const save = async () => {
        setError('');
        if (!form.level || !form.requiredSpend) { setError('Level ve gereken harcama zorunludur.'); return; }
        setSaving(true);
        try {
            const isEdit = !!editTarget;
            const res = await fetch('/api/admin/levels', {
                method: isEdit ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify({
                    ...(isEdit && { id: editTarget.id }),
                    level: Number(form.level),
                    requiredSpend: Number(form.requiredSpend),
                    name: form.name.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Bir hata oluştu.'); return; }
            setAddDialog(false); setEditTarget(null);
            fetchThresholds();
        } finally { setSaving(false); }
    };

    const remove = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            await fetch(`/api/admin/levels?id=${deleteTarget.id}`, { method: 'DELETE', headers });
            setDeleteTarget(null);
            fetchThresholds();
        } finally { setSaving(false); }
    };

    const recalculate = async () => {
        setSaving(true); setRecalcResult('');
        try {
            const res = await fetch('/api/admin/levels/recalculate', { method: 'POST', headers, body: JSON.stringify({ backfill }) });
            const data = await res.json();
            if (!res.ok) { setRecalcResult(data.error || 'Bir hata oluştu.'); return; }
            setRecalcResult(`${data.users} kullanıcı tarandı, ${data.level_changed} kullanıcının seviyesi değişti.`);
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Seviyeler</h2>
                    <p className="text-muted-foreground">
                        Kullanıcılar seviye 0'dan başlar; toplam coin harcaması eşiği geçince seviye atlar.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setRecalcResult(''); setBackfill(false); setRecalcDialog(true); }}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Yeniden Hesapla
                    </Button>
                    <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Yeni Seviye</Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : thresholds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                    <TrendingUp className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Henüz seviye eşiği tanımlanmamış; herkes seviye 0'da kalır.</p>
                    <Button variant="outline" size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Seviye Ekle</Button>
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                            <tr className="border-b">
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Seviye</th>
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Ad</th>
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Gereken Toplam Harcama</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {thresholds.map(t => (
                                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="px-5 py-4 font-semibold">Seviye {t.level}</td>
                                    <td className="px-5 py-4">{t.name ? <Badge variant="secondary">{t.name}</Badge> : <span className="text-muted-foreground">-</span>}</td>
                                    <td className="px-5 py-4">
                                        <span className="flex items-center gap-1.5 font-bold text-amber-600">
                                            <Coins className="h-3.5 w-3.5" /> {t.requiredSpend.toLocaleString('tr-TR')}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-zinc-600" onClick={() => openEdit(t)}>
                                                <Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => setDeleteTarget(t)}>
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

            <Dialog open={addDialog || !!editTarget} onOpenChange={open => { if (!open) { setAddDialog(false); setEditTarget(null); } }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editTarget ? 'Seviyeyi Düzenle' : 'Yeni Seviye Ekle'}</DialogTitle>
                        <DialogDescription>Seviye arttıkça gereken harcama da artmalıdır.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700">Seviye</label>
                            <Input type="number" min="1" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700">Gereken Toplam Harcama (coin)</label>
                            <Input type="number" min="1" placeholder="ör. 1000" value={form.requiredSpend} onChange={e => setForm(f => ({ ...f, requiredSpend: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700">Ad (opsiyonel)</label>
                            <Input placeholder="ör. Bronz" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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

            <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Seviyeyi Sil</DialogTitle>
                        <DialogDescription>
                            <strong>Seviye {deleteTarget?.level}</strong> eşiğini silmek istediğinizden emin misiniz?
                            Kullanıcıların mevcut seviyeleri, "Yeniden Hesapla" çalıştırılana kadar değişmez.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={remove} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={recalcDialog} onOpenChange={open => { if (!open) setRecalcDialog(false); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Seviyeleri Yeniden Hesapla</DialogTitle>
                        <DialogDescription>
                            Tüm kullanıcıların seviyesi güncel eşiklere göre yeniden belirlenir. Eşikleri yükselttiyseniz
                            bazı kullanıcıların seviyesi düşebilir.
                        </DialogDescription>
                    </DialogHeader>
                    <label className="flex items-start gap-2 text-sm py-2">
                        <input type="checkbox" className="mt-1" checked={backfill} onChange={e => setBackfill(e.target.checked)} />
                        <span>
                            Toplam harcamayı hediye geçmişinden yeniden kur.
                            <span className="block text-xs text-muted-foreground">
                                Yalnızca ilk kurulumda kullanın: mevcut harcama sayacının üzerine yazar, mesaj ve hikaye
                                harcamaları geçmişe dönük sayılmaz.
                            </span>
                        </span>
                    </label>
                    {recalcResult && <p className="text-sm text-emerald-700">{recalcResult}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRecalcDialog(false)}>Kapat</Button>
                        <Button onClick={recalculate} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Çalıştır
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
