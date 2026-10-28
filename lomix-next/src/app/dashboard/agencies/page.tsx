"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Search, Building2, Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PersonAvatar, personName, type Person } from '@/components/person-avatar';
import { maskPhone, isValidPhone } from '@/lib/phone-mask';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface AgencyRow {
    id: number;
    name: string;
    isActive: boolean;
    owner: Person;
    memberCount: number;
    totalEarnings: number;
}

const emptyForm = { ownerId: '', whatsappNumber: '', name: '', description: '' };
const PHONE_ERROR = 'WhatsApp numarası geçersiz: Türkiye için +90 5xx xxx xx xx (10 hane), yurt dışı için +ülke kodu ile 10–15 rakam girin.';

export default function AgenciesPage() {
    const router = useRouter();
    const [items, setItems] = useState<AgencyRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [ownerInfo, setOwnerInfo] = useState<{ text: string; ok: boolean } | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    useEffect(() => {
        const t = setTimeout(() => { setPage(1); setSearch(query.trim()); }, 300);
        return () => clearTimeout(t);
    }, [query]);

    const load = async () => {
        setLoading(true); setError('');
        try {
            const res = await fetch(`/api/admin/agencies?page=${page}${search ? `&q=${encodeURIComponent(search)}` : ''}`, { headers });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Yüklenemedi.'); return; }
            setItems(data.agencies || []); setTotal(data.total || 0); setTotalPages(data.totalPages || 1);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [page, search]);

    // Kullanıcı ID'si girilince ad-soyad otomatik gelir.
    useEffect(() => {
        const id = Number(form.ownerId);
        if (!form.ownerId || !Number.isInteger(id) || id < 1) { setOwnerInfo(null); return; }
        const t = setTimeout(async () => {
            const res = await fetch(`/api/admin/agencies/lookup?userId=${id}`, { headers });
            const data = await res.json();
            if (!res.ok) { setOwnerInfo({ text: data.error || 'Kullanıcı bulunamadı.', ok: false }); return; }
            const u = data.user;
            const name = u.fullName || u.username;
            if (u.ownsAgency) setOwnerInfo({ text: `${name}: zaten "${u.ownsAgency.name}" ajansının sahibi.`, ok: false });
            else if (u.memberOf) setOwnerInfo({ text: `${name}: "${u.memberOf.name}" ajansında yayıncı, önce çıkarılmalı.`, ok: false });
            else setOwnerInfo({ text: name, ok: true });
        }, 300);
        return () => clearTimeout(t);
    }, [form.ownerId]);

    const create = async () => {
        setFormError('');
        if (!form.ownerId || !form.name.trim() || !form.whatsappNumber.trim()) { setFormError('Sahip ID, WhatsApp numarası ve ajans ismi zorunludur.'); return; }
        if (!isValidPhone(form.whatsappNumber)) { setFormError(PHONE_ERROR); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/admin/agencies', {
                method: 'POST', headers,
                body: JSON.stringify({ ownerId: Number(form.ownerId), whatsappNumber: form.whatsappNumber, name: form.name, description: form.description }),
            });
            const data = await res.json();
            if (!res.ok) { setFormError(data.error || 'Oluşturulamadı.'); return; }
            setCreateOpen(false);
            router.push(`/dashboard/agencies/${data.agency.id}`);
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Ajanslar</h2>
                    <p className="text-muted-foreground">Ajansları oluşturun, yayıncılarını ve kazançlarını tek yerden takip edin.</p>
                </div>
                <Button onClick={() => { setForm(emptyForm); setFormError(''); setOwnerInfo(null); setCreateOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Ajans Oluştur
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input className="pl-10" placeholder="Ajans ID veya ismi ara..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
                    <Building2 className="h-8 w-8 opacity-30" />
                    <p className="text-sm">{search ? 'Aramanızla eşleşen ajans yok.' : 'Henüz ajans oluşturulmamış.'}</p>
                </div>
            ) : (
                <div className="rounded-xl border overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                            <tr className="border-b">
                                {['Ajans ID', 'Ajans', 'Ajans Sahibi', 'Yayıncı', 'Toplam Kazanç', 'Durum'].map(h => (
                                    <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(a => (
                                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/agencies/${a.id}`)}>
                                    <td className="px-5 py-4 font-mono">#{a.id}</td>
                                    <td className="px-5 py-4 font-semibold">{a.name}</td>
                                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                                        <Link href={`/dashboard/users/${a.owner.id}`} className="flex items-center gap-2 hover:underline">
                                            <PersonAvatar person={a.owner} /> <span>{personName(a.owner)}</span>
                                        </Link>
                                    </td>
                                    <td className="px-5 py-4">{a.memberCount}</td>
                                    <td className="px-5 py-4">
                                        <span className="flex items-center gap-1.5 font-bold text-sky-600"><Diamond className="h-3.5 w-3.5" /> {a.totalEarnings.toLocaleString('tr-TR')}</span>
                                    </td>
                                    <td className="px-5 py-4"><Badge variant={a.isActive ? 'default' : 'secondary'}>{a.isActive ? 'Aktif' : 'Pasif'}</Badge></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{total} ajans</span>
                {totalPages > 1 && (
                    <div className="flex items-center gap-3">
                        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Önceki</Button>
                        <span>{page} / {totalPages}</span>
                        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sonraki</Button>
                    </div>
                )}
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ajans Oluştur</DialogTitle>
                        <DialogDescription>Ajans ID'si otomatik atanır. Sahip, sistemdeki kullanıcı hesabıyla eşleşir.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700">Ajans sahibinin kullanıcı ID'si</label>
                            <Input type="number" min="1" value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))} />
                            {ownerInfo && <p className={`text-xs ${ownerInfo.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{ownerInfo.ok ? `Ad soyad: ${ownerInfo.text}` : ownerInfo.text}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700">WhatsApp numarası</label>
                            <Input type="tel" inputMode="tel" autoComplete="off" placeholder="+90 5xx xxx xx xx" value={form.whatsappNumber} onChange={e => setForm(f => ({ ...f, whatsappNumber: maskPhone(e.target.value, f.whatsappNumber) }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700">Ajans ismi</label>
                            <Input maxLength={100} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700">Açıklama</label>
                            <textarea className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm" maxLength={500} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        {formError && <p className="text-xs text-rose-600">{formError}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>İptal</Button>
                        <Button onClick={create} disabled={saving || (ownerInfo !== null && !ownerInfo.ok)}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Oluştur
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
