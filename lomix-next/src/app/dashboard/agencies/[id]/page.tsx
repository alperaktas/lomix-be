"use client";

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Search, Diamond, Pencil, UserPlus, ArrowRightLeft, UserMinus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PersonAvatar, personName, type Person } from '@/components/person-avatar';
import { maskPhone, isValidPhone } from '@/lib/phone-mask';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface MemberRow { membershipId: number; user: Person; joinedAt: string; leftAt: string | null; earnings: number }
interface PrimPayout { id: number; period: string; periodStart: string; periodEnd: string; turnover: number; ratePercent: number; amount: number }
interface PrimInfo {
    period: 'daily' | 'weekly' | 'monthly' | null;
    paidThrough: string | null;
    current: { start: string; end: string; turnover: number; ratePercent: number; estimatedPrim: number } | null;
    payouts: PrimPayout[];
}
interface Detail {
    prim: PrimInfo;
    agency: { id: number; name: string; description: string | null; whatsappNumber: string | null; isActive: boolean; createdAt: string; owner: Person };
    totalEarnings: number;
    members: MemberRow[];
    pastMembers: MemberRow[];
    pending: { user: Person; requestedAt: string }[];
}
interface AgencyOption { id: number; name: string; isActive: boolean }

type SortKey = 'earnings' | 'joinedAt';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
const PERIOD_LABELS: Record<string, string> = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık' };
const fmtDay = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' });
const Earnings = ({ value }: { value: number }) => (
    <span className="flex items-center gap-1.5 font-bold text-sky-600"><Diamond className="h-3.5 w-3.5" /> {value.toLocaleString('tr-TR')}</span>
);

export default function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [data, setData] = useState<Detail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [busy, setBusy] = useState(false);

    const [memberQuery, setMemberQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('joinedAt');
    const [sortDesc, setSortDesc] = useState(true);

    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '', whatsappNumber: '', ownerId: '' });
    const [addOpen, setAddOpen] = useState(false);
    const [addUserId, setAddUserId] = useState('');
    const [transfer, setTransfer] = useState<MemberRow | null>(null);
    const [targets, setTargets] = useState<AgencyOption[]>([]);
    const [targetId, setTargetId] = useState('');
    const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/agencies/${id}`, { headers });
            const json = await res.json();
            if (!res.ok) { setError(json.error || 'Yüklenemedi.'); return; }
            setData(json); setError('');
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [id]);

    const call = async (url: string, method: string, body?: unknown): Promise<boolean> => {
        setActionError(''); setBusy(true);
        try {
            const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
            const json = await res.json();
            if (!res.ok) { setActionError(json.error || 'İşlem yapılamadı.'); return false; }
            await load();
            return true;
        } finally { setBusy(false); }
    };

    const deleteAgency = async () => {
        setActionError(''); setBusy(true);
        try {
            const res = await fetch(`/api/admin/agencies/${id}`, { method: 'DELETE', headers });
            const json = await res.json();
            if (!res.ok) { setActionError(json.error || 'Ajans silinemedi.'); return; }
            router.push('/dashboard/agencies');
        } finally { setBusy(false); }
    };

    const visibleMembers = useMemo(() => {
        if (!data) return [];
        const q = memberQuery.trim().toLowerCase();
        const idMatch = /^#?\d+$/.test(q) ? Number(q.replace('#', '')) : null;
        const filtered = q === '' ? data.members : data.members.filter(m =>
            (idMatch !== null && m.user.id === idMatch) ||
            m.user.username.toLowerCase().includes(q) ||
            (m.user.fullName ?? '').toLowerCase().includes(q));
        return [...filtered].sort((a, b) => {
            const diff = sortKey === 'earnings' ? a.earnings - b.earnings : new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
            return sortDesc ? -diff : diff;
        });
    }, [data, memberQuery, sortKey, sortDesc]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDesc(d => !d); else { setSortKey(key); setSortDesc(true); }
    };
    const sortMark = (key: SortKey) => (sortKey === key ? (sortDesc ? ' ↓' : ' ↑') : '');

    const openEdit = () => {
        if (!data) return;
        const a = data.agency;
        setEditForm({ name: a.name, description: a.description || '', whatsappNumber: maskPhone(a.whatsappNumber || ''), ownerId: String(a.owner.id) });
        setActionError(''); setEditOpen(true);
    };
    const saveEdit = async () => {
        if (!data) return;
        if (editForm.whatsappNumber && !isValidPhone(editForm.whatsappNumber)) {
            setActionError('WhatsApp numarası geçersiz: Türkiye için +90 5xx xxx xx xx (10 hane), yurt dışı için +ülke kodu ile 10–15 rakam girin.'); return;
        }
        const ok = await call(`/api/admin/agencies/${id}`, 'PUT', {
            name: editForm.name, description: editForm.description, whatsappNumber: editForm.whatsappNumber,
            ...(Number(editForm.ownerId) !== data.agency.owner.id && { ownerId: Number(editForm.ownerId) }),
        });
        if (ok) setEditOpen(false);
    };

    const openTransfer = async (m: MemberRow) => {
        setTransfer(m); setTargetId(''); setActionError('');
        const res = await fetch('/api/admin/agencies?page=1', { headers });
        const json = await res.json();
        setTargets((json.agencies || []).filter((a: AgencyOption) => a.isActive && a.id !== Number(id)));
    };

    if (loading && !data) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    if (!data) return <p className="text-rose-600">{error || 'Ajans bulunamadı.'}</p>;

    const { agency } = data;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Link href="/dashboard/agencies" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" /> Ajanslar
            </Link>

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-tight">{agency.name}</h2>
                        <Badge variant={agency.isActive ? 'default' : 'secondary'}>{agency.isActive ? 'Aktif' : 'Pasif'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Ajans ID #{agency.id} · Oluşturulma {fmtDate(agency.createdAt)}</p>
                    {agency.description && <p className="text-sm max-w-2xl whitespace-pre-wrap">{agency.description}</p>}
                    <p className="text-sm">WhatsApp: <span className="font-mono">{agency.whatsappNumber ? maskPhone(agency.whatsappNumber) : '-'}</span></p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={openEdit}><Pencil className="h-4 w-4 mr-2" /> Düzenle</Button>
                    <Button
                        variant={agency.isActive ? 'outline' : 'default'}
                        disabled={busy}
                        onClick={() => { if (!agency.isActive || confirm('Ajans pasife alınsın mı? Yayıncı ve kazanç kayıtları korunur, yeni yayıncı eklenemez.')) call(`/api/admin/agencies/${id}`, 'PUT', { isActive: !agency.isActive }); }}
                    >
                        {agency.isActive ? 'Pasife Al' : 'Aktif Et'}
                    </Button>
                    <Button variant="outline" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={busy}
                        onClick={() => { setDeleteConfirm(''); setActionError(''); setDeleteOpen(true); }}>
                        <Trash2 className="h-4 w-4 mr-2" /> Sil
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Link href={`/dashboard/users/${agency.owner.id}`} className="rounded-xl border p-4 hover:bg-muted/20">
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Ajans Sahibi</div>
                    <div className="flex items-center gap-3"><PersonAvatar person={agency.owner} className="h-10 w-10" /><div><div className="font-semibold">{personName(agency.owner)}</div><div className="text-xs text-muted-foreground">#{agency.owner.id}</div></div></div>
                </Link>
                <div className="rounded-xl border p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Yayıncı</div>
                    <div className="text-2xl font-bold">{data.members.length}</div>
                </div>
                <div className="rounded-xl border p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Toplam Kazanç (elmas)</div>
                    <div className="text-2xl"><Earnings value={data.totalEarnings} /></div>
                </div>
            </div>

            {actionError && !editOpen && !transfer && <p className="text-sm text-rose-600">{actionError}</p>}

            <div className="rounded-xl border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold">Ajans Primi</h3>
                        <p className="text-sm text-muted-foreground">
                            Yayıncıların dönem cirosu üzerinden kademeli oranla hesaplanır ve ajans sahibine ek elmas olarak yazılır (yayıncıdan düşülmez).
                            Dönemler Türkiye saatiyle kesilir, hafta Pazartesi-Pazar'dır.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-zinc-700">Dönem</label>
                        <select
                            className="h-9 rounded-md border bg-background px-3 text-sm"
                            value={data.prim.period ?? ''}
                            disabled={busy}
                            onChange={e => {
                                const v = e.target.value;
                                if (v === '' && !confirm('Prim kapatılsın mı? Kapanmış dönemlerin primi ödenir, sonrası için prim hesaplanmaz.')) return;
                                call(`/api/admin/agencies/${id}`, 'PUT', { primPeriod: v === '' ? null : v });
                            }}
                        >
                            <option value="">Kapalı</option>
                            {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                </div>

                {data.prim.period && data.prim.current && (
                    <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                        <div className="text-muted-foreground">Süren dönem: {fmtDay(data.prim.current.start)} – {fmtDay(new Date(new Date(data.prim.current.end).getTime() - 1).toISOString())}</div>
                        <div className="flex flex-wrap gap-x-8 gap-y-1">
                            <span>Ciro: <b>{data.prim.current.turnover.toLocaleString('tr-TR')}</b> elmas</span>
                            <span>Kademe oranı: <b>%{data.prim.current.ratePercent}</b></span>
                            <span>Tahmini prim: <b className="text-sky-600">{data.prim.current.estimatedPrim.toLocaleString('tr-TR')}</b> elmas</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Dönem kapandıktan sonra ilk çalışmada (her gün Türkiye saatiyle gece yarısından sonra) ödenir. İlk dönem, prim açıldığı günü takip eden günün başından başlar.</div>
                    </div>
                )}
                {!data.prim.period && <p className="text-sm text-muted-foreground">Prim kapalı. Bir dönem seçince ertesi gün (Türkiye saatiyle) başlar.</p>}

                {data.prim.payouts.length > 0 && (
                    <div className="rounded-lg border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40"><tr className="border-b">
                                {['Dönem', 'Tür', 'Ciro', 'Oran', 'Ödenen prim'].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {data.prim.payouts.map(p => (
                                    <tr key={p.id} className="border-b last:border-0">
                                        <td className="px-4 py-2 whitespace-nowrap">{fmtDay(p.periodStart)} – {fmtDay(new Date(new Date(p.periodEnd).getTime() - 1).toISOString())}</td>
                                        <td className="px-4 py-2">{PERIOD_LABELS[p.period] ?? p.period}</td>
                                        <td className="px-4 py-2">{p.turnover.toLocaleString('tr-TR')}</td>
                                        <td className="px-4 py-2">%{p.ratePercent}</td>
                                        <td className="px-4 py-2"><Earnings value={p.amount} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">Yayıncılar</h3>
                    <div className="flex items-center gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input className="pl-10 h-9" placeholder="Kullanıcı ID veya adı..." value={memberQuery} onChange={e => setMemberQuery(e.target.value)} />
                        </div>
                        <Button size="sm" onClick={() => { setAddUserId(''); setActionError(''); setAddOpen(true); }} disabled={!agency.isActive} title={agency.isActive ? '' : 'Pasif ajansa yayıncı eklenemez'}>
                            <UserPlus className="h-4 w-4 mr-1" /> Yayıncı Ekle
                        </Button>
                    </div>
                </div>

                {visibleMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">{memberQuery ? 'Aramanızla eşleşen yayıncı yok.' : 'Bu ajansta henüz yayıncı yok.'}</p>
                ) : (
                    <div className="rounded-xl border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40">
                                <tr className="border-b">
                                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Yayıncı</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">ID</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('joinedAt')}>Katılma Tarihi{sortMark('joinedAt')}</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('earnings')}>Toplam Kazanç{sortMark('earnings')}</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {visibleMembers.map(m => (
                                    <tr key={m.membershipId} className="border-b last:border-0 hover:bg-muted/20">
                                        <td className="px-5 py-3">
                                            <Link href={`/dashboard/users/${m.user.id}`} className="flex items-center gap-2 hover:underline">
                                                <PersonAvatar person={m.user} /> <span>{personName(m.user)}</span>
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3 font-mono">#{m.user.id}</td>
                                        <td className="px-5 py-3 whitespace-nowrap">{fmtDate(m.joinedAt)}</td>
                                        <td className="px-5 py-3"><Earnings value={m.earnings} /></td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" variant="ghost" className="h-8 px-2" disabled={busy} onClick={() => openTransfer(m)}><ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Aktar</Button>
                                                <Button size="sm" variant="ghost" className="h-8 px-2 text-rose-600 hover:bg-rose-50" disabled={busy} onClick={() => { setActionError(''); setRemoveTarget(m); }}><UserMinus className="h-3.5 w-3.5 mr-1" /> Çıkar</Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {data.pending.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Onay Bekleyenler</h3>
                    <div className="flex flex-wrap gap-2">
                        {data.pending.map(p => (
                            <Link key={p.user.id} href={`/dashboard/users/${p.user.id}`} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm hover:bg-muted/30">
                                <PersonAvatar person={p.user} className="h-6 w-6" /> {personName(p.user)}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {data.pastMembers.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Geçmiş Yayıncılar</h3>
                    <p className="text-sm text-muted-foreground">Ajanstan ayrılan ya da başka ajansa aktarılanlar. Kazanç yalnızca bu ajansta bulundukları dönemi kapsar.</p>
                    <div className="rounded-xl border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40">
                                <tr className="border-b">
                                    {['Yayıncı', 'ID', 'Katılma', 'Ayrılma', 'Bu Ajanstaki Kazanç'].map(h => (
                                        <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.pastMembers.map(m => (
                                    <tr key={m.membershipId} className="border-b last:border-0 hover:bg-muted/20">
                                        <td className="px-5 py-3">
                                            <Link href={`/dashboard/users/${m.user.id}`} className="flex items-center gap-2 hover:underline">
                                                <PersonAvatar person={m.user} /> <span>{personName(m.user)}</span>
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3 font-mono">#{m.user.id}</td>
                                        <td className="px-5 py-3 whitespace-nowrap">{fmtDate(m.joinedAt)}</td>
                                        <td className="px-5 py-3 whitespace-nowrap">{m.leftAt ? fmtDate(m.leftAt) : '-'}</td>
                                        <td className="px-5 py-3"><Earnings value={m.earnings} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Ajansı Düzenle</DialogTitle><DialogDescription>Sahibi değiştirirseniz yeni sahip, sistemdeki kullanıcı ID'siyle eşleşir.</DialogDescription></DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Ajans ismi</label><Input maxLength={100} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">WhatsApp numarası</label><Input type="tel" inputMode="tel" autoComplete="off" placeholder="+90 5xx xxx xx xx" value={editForm.whatsappNumber} onChange={e => setEditForm(f => ({ ...f, whatsappNumber: maskPhone(e.target.value, f.whatsappNumber) }))} /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Ajans sahibinin kullanıcı ID'si</label><Input type="number" min="1" value={editForm.ownerId} onChange={e => setEditForm(f => ({ ...f, ownerId: e.target.value }))} /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold text-zinc-700">Açıklama</label><textarea className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm" maxLength={500} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
                        {actionError && <p className="text-xs text-rose-600">{actionError}</p>}
                    </div>
                    <DialogFooter><Button variant="ghost" onClick={() => setEditOpen(false)}>İptal</Button><Button onClick={saveEdit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kaydet</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ajansı Sil</DialogTitle>
                        <DialogDescription>Bu işlem geri alınamaz.</DialogDescription>
                    </DialogHeader>
                    {data.members.length > 0 ? (
                        <p className="text-sm text-rose-600 py-2">
                            Ajansta {data.members.length} yayıncı var. Silmeden önce yayıncıları başka bir ajansa taşıyın ya da ajanstan çıkarın.
                        </p>
                    ) : (
                        <div className="space-y-3 py-2 text-sm">
                            <p>Ajans ile birlikte şunlar silinir: {data.pastMembers.length} geçmiş yayıncı kaydı, {data.prim.payouts.length} prim ödeme kaydı, {data.pending.length} bekleyen başvuru ve davetler.</p>
                            <p className="text-muted-foreground">Kapanmış prim dönemleri silmeden önce sahibine ödenir; ödenmiş primler cüzdanında kalır. Geçmişi korumak istiyorsanız silmek yerine pasife alın.</p>
                            <label className="block text-xs font-semibold text-zinc-700">Onaylamak için ajans ismini yazın: <span className="font-mono">{agency.name}</span></label>
                            <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} autoComplete="off" />
                        </div>
                    )}
                    {actionError && <p className="text-xs text-rose-600">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Vazgeç</Button>
                        <Button variant="destructive" onClick={deleteAgency} disabled={busy || data.members.length > 0 || deleteConfirm.trim() !== agency.name.trim()}>
                            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Ajansı Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Yayıncı Ekle</DialogTitle><DialogDescription>Eklenen kullanıcı bu ajansın yayıncı listesine girer ve katılma tarihi bugün olarak kaydedilir.</DialogDescription></DialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-xs font-semibold text-zinc-700">Yayıncının kullanıcı ID'si</label>
                        <Input type="number" min="1" value={addUserId} onChange={e => setAddUserId(e.target.value)} />
                        {actionError && <p className="text-xs text-rose-600">{actionError}</p>}
                    </div>
                    <DialogFooter><Button variant="ghost" onClick={() => setAddOpen(false)}>İptal</Button>
                        <Button disabled={busy || !addUserId} onClick={async () => { if (await call(`/api/admin/agencies/${id}/members`, 'POST', { userId: Number(addUserId) })) setAddOpen(false); }}>
                            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Ekle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!transfer} onOpenChange={o => { if (!o) setTransfer(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Yayıncıyı Aktar</DialogTitle>
                        <DialogDescription>{transfer && `${personName(transfer.user)} başka bir ajansa aktarılır. Şu ana kadarki kazancı bu ajansta kalır; sonrası yeni ajansa yazılır.`}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-xs font-semibold text-zinc-700">Hedef ajans</label>
                        <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="">Ajans seçin</option>
                            {targets.map(t => <option key={t.id} value={t.id}>#{t.id} · {t.name}</option>)}
                        </select>
                        {targets.length === 0 && <p className="text-xs text-muted-foreground">Aktarılabilecek başka aktif ajans yok.</p>}
                        {actionError && <p className="text-xs text-rose-600">{actionError}</p>}
                    </div>
                    <DialogFooter><Button variant="ghost" onClick={() => setTransfer(null)}>İptal</Button>
                        <Button disabled={busy || !targetId} onClick={async () => { if (transfer && await call(`/api/admin/agencies/${id}/members`, 'PUT', { userId: transfer.user.id, toAgencyId: Number(targetId) })) setTransfer(null); }}>
                            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Aktar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!removeTarget} onOpenChange={o => { if (!o) setRemoveTarget(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Yayıncıyı Çıkar</DialogTitle>
                        <DialogDescription>{removeTarget && `${personName(removeTarget.user)} ajanstan çıkarılsın mı? Geçmiş dönem ve kazanç kaydı "Geçmiş Yayıncılar" altında korunur.`}</DialogDescription>
                    </DialogHeader>
                    {actionError && <p className="text-xs text-rose-600">{actionError}</p>}
                    <DialogFooter><Button variant="outline" onClick={() => setRemoveTarget(null)}>İptal</Button>
                        <Button variant="destructive" disabled={busy} onClick={async () => { if (removeTarget && await call(`/api/admin/agencies/${id}/members?userId=${removeTarget.user.id}`, 'DELETE')) setRemoveTarget(null); }}>
                            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Çıkar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
