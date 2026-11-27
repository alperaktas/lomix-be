"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface Method { id: number; name: string; description: string; minAmount: number; maxAmount: number; isActive: boolean; requiresBankInfo: boolean }

const fmt = (n: number) => n.toLocaleString('tr-TR');
const EMPTY = { name: '', description: '', minAmount: '', maxAmount: '', requiresBankInfo: true };

export default function WithdrawMethodsPage() {
    const [items, setItems] = useState<Method[]>([]);
    const [amountOptions, setAmountOptions] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editTarget, setEditTarget] = useState<Method | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Method | null>(null);
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/withdraw-methods', { headers });
            const data = await res.json();
            if (!res.ok) { setError(res.status === 401 || res.status === 403 ? 'Oturumun süresi dolmuş olabilir. Çıkış yapıp tekrar giriş yap.' : (data.error || 'Yüklenemedi.')); return; }
            setItems(data.methods || []);
            setAmountOptions((data.amountOptions || []).join(', '));
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const min = Number(form.minAmount), max = Number(form.maxAmount);
    const valid = form.name.trim() !== '' && form.minAmount !== '' && form.maxAmount !== ''
        && Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max >= min;

    const send = async (method: string, body: unknown, query = '') => {
        const res = await fetch(`/api/admin/withdraw-methods${query}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        const data = await res.json();
        return { ok: res.ok, data };
    };

    const save = async () => {
        setError(''); setNotice(''); setSaving(true);
        try {
            const body = { name: form.name.trim(), description: form.description.trim(), minAmount: min, maxAmount: max, requiresBankInfo: form.requiresBankInfo };
            const r = editTarget ? await send('PUT', { id: editTarget.id, ...body }) : await send('POST', body);
            if (!r.ok) { setError(r.data.error || 'Kaydedilemedi.'); return; }
            setAddOpen(false); setEditTarget(null);
            load();
        } finally { setSaving(false); }
    };

    const toggle = async (m: Method) => {
        setError(''); setNotice('');
        const r = await send('PUT', { id: m.id, isActive: !m.isActive });
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

    const saveOptions = async () => {
        setError(''); setNotice(''); setSaving(true);
        try {
            const r = await send('PUT', { amountOptions: amountOptions });
            if (!r.ok) { setError(r.data.error || 'Kaydedilemedi.'); return; }
            setAmountOptions((r.data.amountOptions || []).join(', '));
            setNotice('Hızlı miktarlar kaydedildi.');
        } finally { setSaving(false); }
    };

    const activeCount = items.filter(i => i.isActive).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Çekim Yöntemleri</h2>
                    <p className="text-muted-foreground max-w-2xl">
                        Kullanıcılar elmaslarını burada tanımladığınız yöntemlerle çeker. Yöntem adı kullanıcıya gösterilir. Her yöntem için çekilebilecek en düşük ve en yüksek elmas miktarını girin.
                        <b> Aktif yöntem yoksa çekim yapılamaz.</b> Kullanıcıya göre kapatmak için kullanıcı detayındaki "Cüzdan İşlemleri"ni kullanın.
                    </p>
                </div>
                <Button onClick={() => { setForm(EMPTY); setError(''); setEditTarget(null); setAddOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Yöntem Ekle
                </Button>
            </div>

            {notice && <p className="text-sm text-emerald-700">{notice}</p>}
            {error && !addOpen && !editTarget && !deleteTarget && <p className="text-sm text-rose-600">{error}</p>}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <>
                    {items.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground max-w-3xl">
                            <p className="font-semibold text-foreground">Henüz çekim yöntemi yok</p>
                            <p className="text-sm mt-1">Yöntem eklenene kadar mobilde elmas çekilemez.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">{items.length} yöntem, {activeCount} aktif</p>
                            <div className="rounded-xl border overflow-x-auto max-w-4xl">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40"><tr className="border-b">
                                        {['Yöntem', 'Açıklama', 'Miktar aralığı', 'Durum', ''].map(h => (
                                            <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                                        ))}
                                    </tr></thead>
                                    <tbody>
                                        {items.map(m => (
                                            <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                                                <td className="px-5 py-4 font-semibold">{m.name}{m.requiresBankInfo && <div className="text-xs font-normal text-muted-foreground">IBAN istenir</div>}</td>
                                                <td className="px-5 py-4 text-muted-foreground">{m.description || '—'}</td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className="flex items-center gap-1.5"><Diamond className="h-3.5 w-3.5 text-sky-600" /> {fmt(m.minAmount)} – {fmt(m.maxAmount)}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => toggle(m)} title="Tıklayınca durumu değiştirir">
                                                        <Badge variant="outline" className={m.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}>
                                                            {m.isActive ? 'Aktif' : 'Pasif'}
                                                        </Badge>
                                                    </Button>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setForm({ name: m.name, description: m.description, minAmount: String(m.minAmount), maxAmount: String(m.maxAmount), requiresBankInfo: m.requiresBankInfo }); setError(''); setEditTarget(m); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle</Button>
                                                        <Button variant="ghost" size="sm" className="h-8 px-2 text-rose-600 hover:bg-rose-50" onClick={() => { setError(''); setDeleteTarget(m); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Sil</Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border p-5 max-w-4xl space-y-3">
                        <div>
                            <h3 className="font-semibold">Hızlı miktar düğmeleri</h3>
                            <p className="text-sm text-muted-foreground">Çekim ekranında hazır düğme olarak çıkan elmas miktarları. Virgülle ayırın (en fazla 6), örn. <code>100000, 250000, 1000000</code>. Boş bırakırsanız düğme çıkmaz.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Input className="max-w-md" value={amountOptions} onChange={e => setAmountOptions(e.target.value)} placeholder="100000, 250000, 1000000" />
                            <Button onClick={saveOptions} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kaydet</Button>
                        </div>
                    </div>
                </>
            )}

            <Dialog open={addOpen || !!editTarget} onOpenChange={o => { if (!o) { setAddOpen(false); setEditTarget(null); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editTarget ? 'Yöntemi Düzenle' : 'Yöntem Ekle'}</DialogTitle>
                        <DialogDescription>Yöntem adı kullanıcıya gösterilir ve çekim isteğinde aynen gönderilir. Adı değiştirirseniz eski uygulama sürümleri yöntemi bulamayabilir.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Yöntem adı</label>
                            <Input value={form.name} maxLength={100} placeholder="Örn. Payermax_Banktransfer(9108)" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Açıklama <span className="text-zinc-400 font-normal">(isteğe bağlı)</span></label>
                            <Input value={form.description} maxLength={200} placeholder="Örn. Banka havalesi" onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">En düşük elmas</label>
                                <Input type="number" min="1" step="1" placeholder="1000" value={form.minAmount} onChange={e => setForm(f => ({ ...f, minAmount: e.target.value }))} /></div>
                            <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">En yüksek elmas</label>
                                <Input type="number" min="1" step="1" placeholder="1000000" value={form.maxAmount} onChange={e => setForm(f => ({ ...f, maxAmount: e.target.value }))} /></div>
                        </div>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 mt-0.5 rounded" checked={form.requiresBankInfo} onChange={e => setForm(f => ({ ...f, requiresBankInfo: e.target.checked }))} />
                            <span className="text-sm">Banka bilgisi iste <span className="block text-xs text-muted-foreground">Açıksa kullanıcı banka adı, IBAN ve hesap sahibini girmeden çekim talebi oluşturamaz (havale / EFT).</span></span>
                        </label>
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
                        <DialogTitle>Yöntemi Sil</DialogTitle>
                        <DialogDescription>{deleteTarget && `"${deleteTarget.name}" silinsin mi? Geçmiş çekim kayıtları etkilenmez, yöntem mobilde artık görünmez. Geçici olarak kapatmak için "Pasif" yapabilirsiniz.`}</DialogDescription>
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
