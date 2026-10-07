"use client";

import { useEffect, useState } from 'react';
import { Loader2, Send, Trash2, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Audience = 'all' | 'broadcasters' | 'agency' | 'user';

interface HistoryItem {
    id: number;
    title: string;
    body: string;
    audience: Audience;
    agency: { id: number; name: string } | null;
    targetUser: { id: number; username: string; fullName: string | null } | null;
    readCount: number;
    createdAt: string;
}

interface UserOption { id: number; username: string; fullName: string | null; isBroadcaster: boolean }

const AUDIENCE_LABELS: Record<Audience, string> = {
    all: 'Tüm kullanıcılar',
    broadcasters: 'Tüm yayıncılar',
    agency: 'Belirli bir ajans',
    user: 'Seçili kullanıcılar',
};

export default function NotificationsPage() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [audience, setAudience] = useState<Audience>('all');
    const [agencies, setAgencies] = useState<{ id: number; name: string }[]>([]);
    const [agencyId, setAgencyId] = useState('');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserOption[]>([]);
    const [selected, setSelected] = useState<UserOption[]>([]);
    const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/notifications', { headers });
            const data = await res.json();
            setHistory(data.notifications || []);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchHistory();
        fetch('/api/admin/notifications/targets?type=agencies', { headers })
            .then(r => r.json()).then(d => setAgencies(d.agencies || [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (audience !== 'user' || query.trim().length < 2) { setResults([]); return; }
        const t = setTimeout(async () => {
            const res = await fetch(`/api/admin/notifications/targets?type=users&q=${encodeURIComponent(query.trim())}`, { headers });
            const data = await res.json();
            setResults(data.users || []);
        }, 300);
        return () => clearTimeout(t);
    }, [query, audience]);

    const addUser = (u: UserOption) => {
        if (!selected.some(s => s.id === u.id)) setSelected(s => [...s, u]);
        setQuery(''); setResults([]);
    };

    const send = async () => {
        setMessage(null);
        if (!title.trim() || !body.trim()) { setMessage({ type: 'err', text: 'Başlık ve içerik zorunludur.' }); return; }
        if (audience === 'agency' && !agencyId) { setMessage({ type: 'err', text: 'Bir ajans seçin.' }); return; }
        if (audience === 'user' && selected.length === 0) { setMessage({ type: 'err', text: 'En az bir kullanıcı seçin.' }); return; }

        setSending(true);
        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: title.trim(),
                    body: body.trim(),
                    audience,
                    ...(audience === 'agency' && { agencyId: Number(agencyId) }),
                    ...(audience === 'user' && { userIds: selected.map(s => s.id) }),
                }),
            });
            const data = await res.json();
            if (!res.ok) { setMessage({ type: 'err', text: data.error || 'Gönderilemedi.' }); return; }
            setMessage({ type: 'ok', text: `Bildirim gönderildi (${data.created} kayıt).` });
            setTitle(''); setBody(''); setSelected([]);
            fetchHistory();
        } finally { setSending(false); }
    };

    const remove = async (id: number) => {
        if (!confirm('Bu bildirim silinsin mi? Kullanıcıların gelen kutusundan da kalkar.')) return;
        await fetch(`/api/admin/notifications?id=${id}`, { method: 'DELETE', headers });
        fetchHistory();
    };

    const targetLabel = (n: HistoryItem) => {
        if (n.audience === 'agency') return `Ajans: ${n.agency?.name ?? '-'}`;
        if (n.audience === 'user') return `Kullanıcı: ${n.targetUser?.fullName || n.targetUser?.username || n.targetUser?.id}`;
        return AUDIENCE_LABELS[n.audience];
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Bildirimler</h2>
                <p className="text-muted-foreground">Kullanıcılara uygulama içi bildirim gönderin.</p>
            </div>

            <div className="rounded-xl border p-5 space-y-4 max-w-2xl">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Kime</label>
                    <select
                        className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                        value={audience}
                        onChange={e => setAudience(e.target.value as Audience)}
                    >
                        {(Object.keys(AUDIENCE_LABELS) as Audience[]).map(a => (
                            <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>
                        ))}
                    </select>
                </div>

                {audience === 'agency' && (
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700">Ajans</label>
                        <select
                            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                            value={agencyId}
                            onChange={e => setAgencyId(e.target.value)}
                        >
                            <option value="">Ajans seçin</option>
                            {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        {agencies.length === 0 && <p className="text-xs text-muted-foreground">Henüz ajans yok.</p>}
                    </div>
                )}

                {audience === 'user' && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-700">Kullanıcı ara (ad, kullanıcı adı veya id)</label>
                        <Input placeholder="en az 2 karakter" value={query} onChange={e => setQuery(e.target.value)} />
                        {results.length > 0 && (
                            <div className="rounded-md border divide-y max-h-48 overflow-auto">
                                {results.map(u => (
                                    <button key={u.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 flex items-center justify-between" onClick={() => addUser(u)}>
                                        <span>{u.fullName || u.username} <span className="text-muted-foreground">#{u.id} @{u.username}</span></span>
                                        {u.isBroadcaster && <Badge variant="secondary">Yayıncı</Badge>}
                                    </button>
                                ))}
                            </div>
                        )}
                        {selected.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selected.map(u => (
                                    <Badge key={u.id} variant="secondary" className="gap-1">
                                        {u.fullName || u.username}
                                        <button type="button" onClick={() => setSelected(s => s.filter(x => x.id !== u.id))}><X className="h-3 w-3" /></button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Başlık</label>
                    <Input maxLength={100} value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">İçerik</label>
                    <textarea
                        className="w-full min-h-28 rounded-md border bg-background px-3 py-2 text-sm"
                        maxLength={1000}
                        value={body}
                        onChange={e => setBody(e.target.value)}
                    />
                </div>

                {message && <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>{message.text}</p>}
                <Button onClick={send} disabled={sending}>
                    {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} Gönder
                </Button>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-3">Gönderim Geçmişi</h3>
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : history.length === 0 ? (
                    <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground">
                        <Bell className="h-8 w-8 opacity-30" />
                        <p className="text-sm">Henüz bildirim gönderilmemiş.</p>
                    </div>
                ) : (
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40">
                                <tr className="border-b">
                                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Bildirim</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Hedef</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Okunma</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tarih</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(n => (
                                    <tr key={n.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors align-top">
                                        <td className="px-5 py-4">
                                            <div className="font-semibold">{n.title}</div>
                                            <div className="text-muted-foreground line-clamp-2">{n.body}</div>
                                        </td>
                                        <td className="px-5 py-4"><Badge variant="secondary">{targetLabel(n)}</Badge></td>
                                        <td className="px-5 py-4">{n.readCount}</td>
                                        <td className="px-5 py-4 whitespace-nowrap">{new Date(n.createdAt).toLocaleString('tr-TR')}</td>
                                        <td className="px-5 py-4 text-right">
                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => remove(n.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
