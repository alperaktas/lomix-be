"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, MessageCircleHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface HiMessage {
    id: number;
    text: string;
    isActive: boolean;
    createdAt: string;
}

const TEXT_MAX = 500;

export default function HiMessagesPage() {
    const [items, setItems] = useState<HiMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editTarget, setEditTarget] = useState<HiMessage | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<HiMessage | null>(null);
    const [addDialog, setAddDialog] = useState(false);
    const [text, setText] = useState('');
    const [error, setError] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/hi-messages', { headers });
            const data = await res.json();
            setItems(data.messages || []);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const openAdd = () => { setText(''); setError(''); setAddDialog(true); };
    const openEdit = (m: HiMessage) => { setText(m.text); setError(''); setEditTarget(m); };

    const save = async () => {
        setError('');
        if (!text.trim()) { setError('Mesaj metni zorunludur.'); return; }
        setSaving(true);
        try {
            const isEdit = !!editTarget;
            const res = await fetch('/api/admin/hi-messages', {
                method: isEdit ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify(isEdit ? { id: editTarget!.id, text: text.trim() } : { text: text.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Bir hata oluştu.'); return; }
            setAddDialog(false); setEditTarget(null);
            load();
        } finally { setSaving(false); }
    };

    const toggle = async (m: HiMessage) => {
        const res = await fetch('/api/admin/hi-messages', { method: 'PUT', headers, body: JSON.stringify({ id: m.id, isActive: !m.isActive }) });
        if (res.ok) setItems(list => list.map(x => (x.id === m.id ? { ...x, isActive: !m.isActive } : x)));
    };

    const remove = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            await fetch(`/api/admin/hi-messages?id=${deleteTarget.id}`, { method: 'DELETE', headers });
            setDeleteTarget(null);
            load();
        } finally { setSaving(false); }
    };

    const activeCount = items.filter(i => i.isActive).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Hi Mesajları</h2>
                    <p className="text-muted-foreground max-w-2xl">
                        Kullanıcı "Hi" butonuna basınca aktif mesajlardan biri rastgele karşı tarafa gönderilir.
                        Mesaj normal mesaj kurallarına tabidir: arkadaşlar arası ücretsiz, diğerlerinden mesaj ücreti kadar coin düşer.
                        Aktif mesaj yoksa yalnızca buton durumu değişir, mesaj gitmez.
                    </p>
                </div>
                <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Yeni Mesaj</Button>
            </div>

            {!loading && items.length > 0 && (
                <p className="text-sm text-muted-foreground">{activeCount} aktif / {items.length} mesaj</p>
            )}

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                    <MessageCircleHeart className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Henüz Hi mesajı tanımlanmamış.</p>
                    <Button variant="outline" size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Mesaj Ekle</Button>
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                            <tr className="border-b">
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Mesaj</th>
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Durum</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(m => (
                                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className={`px-5 py-4 whitespace-pre-wrap break-words ${m.isActive ? '' : 'text-muted-foreground'}`}>{m.text}</td>
                                    <td className="px-5 py-4">
                                        <button type="button" onClick={() => toggle(m)} title="Durumu değiştir">
                                            <Badge variant={m.isActive ? 'default' : 'secondary'}>{m.isActive ? 'Aktif' : 'Pasif'}</Badge>
                                        </button>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-zinc-600" onClick={() => openEdit(m)}>
                                                <Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => setDeleteTarget(m)}>
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editTarget ? 'Mesajı Düzenle' : 'Yeni Hi Mesajı'}</DialogTitle>
                        <DialogDescription>Hi butonuna basıldığında karşı tarafa gidecek metin.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <textarea
                            className="w-full min-h-28 rounded-md border bg-background px-3 py-2 text-sm"
                            maxLength={TEXT_MAX}
                            placeholder="ör. Merhaba, tanışmak isterim!"
                            value={text}
                            onChange={e => setText(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground text-right">{text.length}/{TEXT_MAX}</p>
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
                        <DialogTitle>Mesajı Sil</DialogTitle>
                        <DialogDescription>Bu Hi mesajını silmek istediğinizden emin misiniz?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={remove} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
