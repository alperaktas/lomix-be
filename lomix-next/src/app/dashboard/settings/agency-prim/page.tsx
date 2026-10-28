"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Diamond, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface Tier { id: number; fromDiamonds: number; ratePercent: number }

const fmt = (n: number) => n.toLocaleString('tr-TR');

export default function AgencyPrimPage() {
    const [tiers, setTiers] = useState<Tier[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editTarget, setEditTarget] = useState<Tier | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Tier | null>(null);
    const [form, setForm] = useState({ fromDiamonds: '', ratePercent: '' });
    const [error, setError] = useState('');
    const [runResult, setRunResult] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/agency-prim/tiers', { headers });
            const data = await res.json();
            setTiers(data.tiers || []);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const save = async () => {
        setError('');
        if (form.fromDiamonds === '' || form.ratePercent === '') { setError('Alt sınır ve oran zorunludur.'); return; }
        setSaving(true);
        try {
            const isEdit = !!editTarget;
            const res = await fetch('/api/admin/agency-prim/tiers', {
                method: isEdit ? 'PUT' : 'POST', headers,
                body: JSON.stringify({ ...(isEdit && { id: editTarget!.id }), fromDiamonds: Number(form.fromDiamonds), ratePercent: Number(form.ratePercent) }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Kaydedilemedi.'); return; }
            setAddOpen(false); setEditTarget(null);
            load();
        } finally { setSaving(false); }
    };

    const remove = async () => {
        if (!deleteTarget) return;
        setSaving(true); setError('');
        try {
            const res = await fetch(`/api/admin/agency-prim/tiers?id=${deleteTarget.id}`, { method: 'DELETE', headers });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Silinemedi.'); return; }
            setDeleteTarget(null);
            load();
        } finally { setSaving(false); }
    };

    const runNow = async () => {
        if (!confirm('Kapanmış dönemlerin primleri şimdi ajans sahiplerine yazılsın mı? Süren dönemler etkilenmez, aynı dönem iki kez ödenmez.')) return;
        setSaving(true); setRunResult('');
        try {
            const res = await fetch('/api/admin/agency-prim/run', { method: 'POST', headers });
            const data = await res.json();
            setRunResult(res.ok ? `${data.agencies} ajans tarandı, ${data.chunks} dönem ödendi, toplam ${fmt(data.paid)} elmas.` : (data.error || 'Çalıştırılamadı.'));
        } finally { setSaving(false); }
    };

    const rangeLabel = (i: number) => {
        const from = tiers[i].fromDiamonds;
        const next = tiers[i + 1]?.fromDiamonds;
        return next === undefined ? `${fmt(from)} ve üzeri` : `${fmt(from)} – ${fmt(next)}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Ajans Prim Oranları</h2>
                    <p className="text-muted-foreground max-w-2xl">
                        Ajansın dönem cirosu (yayıncılarının toplam kazancı, elmas) hangi kademeye düşüyorsa o oran <b>tüm cironun</b> primi olarak
                        ajans sahibine ek elmas verilir. Alt sınır dahildir: tam 5.000.000, ikinci kademededir. Dönemi (günlük/haftalık/aylık) her ajansın detay sayfasından seçersiniz.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={runNow} disabled={saving}><PlayCircle className="h-4 w-4 mr-2" /> Primleri Şimdi Hesapla</Button>
                    <Button onClick={() => { setForm({ fromDiamonds: '', ratePercent: '' }); setError(''); setAddOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Kademe Ekle</Button>
                </div>
            </div>

            {runResult && <p className="text-sm text-emerald-700">{runResult}</p>}
            {error && !addOpen && !editTarget && <p className="text-sm text-rose-600">{error}</p>}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="rounded-xl border overflow-hidden max-w-2xl">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40"><tr className="border-b">
                            <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Ciro aralığı</th>
                            <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Prim oranı</th>
                            <th className="px-5 py-3" />
                        </tr></thead>
                        <tbody>
                            {tiers.map((t, i) => (
                                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                                    <td className="px-5 py-4"><span className="flex items-center gap-1.5 font-semibold"><Diamond className="h-3.5 w-3.5 text-sky-600" /> {rangeLabel(i)}</span></td>
                                    <td className="px-5 py-4 font-bold">%{t.ratePercent}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setForm({ fromDiamonds: String(t.fromDiamonds), ratePercent: String(t.ratePercent) }); setError(''); setEditTarget(t); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle</Button>
                                            {t.fromDiamonds !== 0 && <Button variant="ghost" size="sm" className="h-8 px-2 text-rose-600 hover:bg-rose-50" onClick={() => { setError(''); setDeleteTarget(t); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Sil</Button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={addOpen || !!editTarget} onOpenChange={o => { if (!o) { setAddOpen(false); setEditTarget(null); } }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>{editTarget ? 'Kademeyi Düzenle' : 'Kademe Ekle'}</DialogTitle><DialogDescription>Alt sınır elmas cinsindendir (örn. 5000000).</DialogDescription></DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Alt sınır (elmas)</label>
                            <Input type="number" min="0" disabled={editTarget?.fromDiamonds === 0} value={form.fromDiamonds} onChange={e => setForm(f => ({ ...f, fromDiamonds: e.target.value }))} /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Prim oranı (%)</label>
                            <Input type="number" min="0" max="100" value={form.ratePercent} onChange={e => setForm(f => ({ ...f, ratePercent: e.target.value }))} /></div>
                        {error && <p className="text-xs text-rose-600">{error}</p>}
                    </div>
                    <DialogFooter><Button variant="ghost" onClick={() => { setAddOpen(false); setEditTarget(null); }}>İptal</Button>
                        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kaydet</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Kademeyi Sil</DialogTitle><DialogDescription>{deleteTarget && `${fmt(deleteTarget.fromDiamonds)} elmas ve üzeri kademesi silinsin mi? Bu cironun primi bir alttaki kademenin oranıyla hesaplanır.`}</DialogDescription></DialogHeader>
                    {error && <p className="text-xs text-rose-600">{error}</p>}
                    <DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={remove} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
