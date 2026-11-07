"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface Threshold { id: number; level: number; requiredGifts: number; name: string | null }

const fmt = (n: number) => n.toLocaleString('tr-TR');

export default function RoomLevelsPage() {
    const [items, setItems] = useState<Threshold[]>([]);
    const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editTarget, setEditTarget] = useState<Threshold | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Threshold | null>(null);
    const [form, setForm] = useState({ level: '', requiredGifts: '', name: '' });
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/room-levels', { headers });
            const data = await res.json();
            if (!res.ok) { setError(res.status === 401 || res.status === 403 ? 'Oturumun süresi dolmuş olabilir. Çıkış yapıp tekrar giriş yap.' : (data.error || 'Yüklenemedi.')); return; }
            setItems(data.thresholds || []);
            setRoomCounts(data.roomCounts || {});
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const level = Number(form.level), required = Number(form.requiredGifts);
    const isBase = form.level !== '' && level === 0;
    const valid = form.level !== '' && Number.isInteger(level) && level >= 0
        && (isBase || (form.requiredGifts !== '' && Number.isInteger(required) && required >= 1));

    const send = async (method: string, body: unknown, query = '') => {
        const res = await fetch(`/api/admin/room-levels${query}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        const data = await res.json();
        return { ok: res.ok, data };
    };

    const done = (data: { recalc?: { rooms: number; raised: number } }) => {
        if (data.recalc) setNotice(`Kaydedildi. ${data.recalc.rooms} oda yeniden hesaplandı, ${data.recalc.raised} odanın seviyesi yükseldi.`);
        setAddOpen(false); setEditTarget(null);
        load();
    };

    const save = async () => {
        setError(''); setNotice(''); setSaving(true);
        try {
            const body = { level, requiredGifts: isBase ? 0 : required, name: form.name };
            const r = editTarget ? await send('PUT', { id: editTarget.id, ...body }) : await send('POST', body);
            if (!r.ok) { setError(r.data.error || 'Kaydedilemedi.'); return; }
            done(r.data);
        } finally { setSaving(false); }
    };

    const remove = async () => {
        if (!deleteTarget) return;
        setSaving(true); setError(''); setNotice('');
        try {
            const r = await send('DELETE', undefined, `?id=${deleteTarget.id}`);
            if (!r.ok) { setError(r.data.error || 'Silinemedi.'); return; }
            setDeleteTarget(null);
            setNotice('Seviye silindi. Odaların mevcut seviyesi düşmedi.');
            load();
        } finally { setSaving(false); }
    };

    const openAdd = () => {
        const next = items.length ? Math.max(...items.map(i => i.level)) + 1 : 0;
        setForm({ level: String(next), requiredGifts: '', name: '' });
        setError(''); setEditTarget(null); setAddOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Oda Seviyeleri</h2>
                    <p className="text-muted-foreground max-w-2xl">
                        Oda seviyesi, odada kişilere gönderilen hediyelerin toplam coin değerine göre otomatik yükselir. Her seviye için gereken toplamı girin.
                        <b> Seviyeler düşmez.</b> Hiç seviye tanımlı değilse mobilde oda seviyesi "X" görünür. Seviye 0'ı tanımlarsanız yeni odalar 0 ile başlar.
                    </p>
                </div>
                <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Seviye Ekle</Button>
            </div>

            {notice && <p className="text-sm text-emerald-700">{notice}</p>}
            {error && !addOpen && !editTarget && !deleteTarget && <p className="text-sm text-rose-600">{error}</p>}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
                <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground max-w-3xl">
                    <p className="font-semibold text-foreground">Henüz oda seviyesi tanımlı değil</p>
                    <p className="text-sm mt-1">Seviye ekleyene kadar odaların seviyesi belirsiz kalır (mobilde "X").</p>
                </div>
            ) : (
                <div className="rounded-xl border overflow-x-auto max-w-3xl">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40"><tr className="border-b">
                            <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Seviye</th>
                            <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Ad</th>
                            <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Gereken hediye toplamı</th>
                            <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Oda sayısı</th>
                            <th className="px-5 py-3" />
                        </tr></thead>
                        <tbody>
                            {items.map(i => (
                                <tr key={i.id} className="border-b last:border-0 hover:bg-muted/20">
                                    <td className="px-5 py-4 font-semibold">Seviye {i.level}</td>
                                    <td className="px-5 py-4 text-muted-foreground">{i.name || '—'}</td>
                                    <td className="px-5 py-4">
                                        <span className="flex items-center gap-2 whitespace-nowrap"><Gift className="h-3.5 w-3.5 text-amber-600" /> {fmt(i.requiredGifts)} coin</span>
                                    </td>
                                    <td className="px-5 py-4 text-muted-foreground">{fmt(roomCounts[String(i.level)] ?? 0)}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setForm({ level: String(i.level), requiredGifts: String(i.requiredGifts), name: i.name || '' }); setError(''); setEditTarget(i); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle</Button>
                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-rose-600 hover:bg-rose-50" onClick={() => { setError(''); setDeleteTarget(i); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Sil</Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {roomCounts['null'] ? <p className="px-5 py-3 text-xs text-muted-foreground border-t">{fmt(roomCounts['null'])} odanın seviyesi henüz belirsiz.</p> : null}
                </div>
            )}

            <Dialog open={addOpen || !!editTarget} onOpenChange={o => { if (!o) { setAddOpen(false); setEditTarget(null); } }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editTarget ? 'Seviyeyi Düzenle' : 'Seviye Ekle'}</DialogTitle>
                        <DialogDescription>Oda, bu seviyeye gereken hediye toplamına ulaşınca seviye atlar. Kaydedince mevcut odalar yeniden hesaplanır.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Seviye</label>
                            <Input type="number" min="0" step="1" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Gereken hediye toplamı (coin)</label>
                            <Input type="number" min="1" step="1" disabled={isBase} placeholder={isBase ? 'Seviye 0 için her zaman 0' : 'Örn. 5000'} value={isBase ? '' : form.requiredGifts} onChange={e => setForm(f => ({ ...f, requiredGifts: e.target.value }))} /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Ad <span className="text-zinc-400 font-normal">(isteğe bağlı)</span></label>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn. Bronz" /></div>
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
                        <DialogTitle>Seviyeyi Sil</DialogTitle>
                        <DialogDescription>{deleteTarget && `Seviye ${deleteTarget.level} silinsin mi? Odaların mevcut seviyesi düşmez, ama yeni yükselmelerde bu seviye verilmez.`}</DialogDescription>
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
