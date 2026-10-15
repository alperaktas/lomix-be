"use client";

import { useEffect, useState } from 'react';
import { Loader2, Inbox, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Complaint {
    id: number;
    category: string;
    description: string;
    imageUrls: string[];
    status: 'pending' | 'in_progress' | 'completed';
    createdAt: string;
    user: { id: number; username: string; fullName: string | null };
    messageCount: number;
    awaitingSupport: boolean;
}

interface ThreadMessage {
    id: string;
    sender_type: 'user' | 'support';
    sender: { name: string };
    content: string | null;
    image_urls: string[];
    created_at: string;
}

const STATUS_LABELS: Record<string, string> = { pending: 'Beklemede', in_progress: 'İnceleniyor', completed: 'Tamamlandı' };
const FILTERS = [{ key: '', label: 'Tümü' }, { key: 'pending', label: 'Beklemede' }, { key: 'in_progress', label: 'İnceleniyor' }, { key: 'completed', label: 'Tamamlandı' }];

export default function ComplaintsPage() {
    const [items, setItems] = useState<Complaint[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/complaints?page=${page}${status ? `&status=${status}` : ''}`, { headers });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Yüklenemedi.'); return; }
            setItems(data.complaints || []);
            setCounts(data.counts || {});
            setTotalPages(data.totalPages || 1);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [status, page]);

    const changeStatus = async (id: number, next: string) => {
        setError(''); setBusyId(id);
        try {
            const res = await fetch('/api/admin/complaints', { method: 'PUT', headers, body: JSON.stringify({ id, status: next }) });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Güncellenemedi.'); return; }
            await load();
        } finally { setBusyId(null); }
    };

    const [thread, setThread] = useState<Complaint | null>(null);
    const [messages, setMessages] = useState<ThreadMessage[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [threadError, setThreadError] = useState('');

    const loadThread = async (c: Complaint) => {
        setThreadLoading(true); setThreadError('');
        try {
            const res = await fetch(`/api/admin/complaints/messages?complaintId=${c.id}`, { headers });
            const data = await res.json();
            if (!res.ok) { setThreadError(data.error || 'Konuşma yüklenemedi.'); return; }
            setMessages(data.messages || []);
        } finally { setThreadLoading(false); }
    };

    const openThread = (c: Complaint) => { setThread(c); setMessages([]); setReply(''); loadThread(c); };

    const sendReply = async () => {
        if (!thread || !reply.trim()) return;
        setSending(true); setThreadError('');
        try {
            const res = await fetch('/api/admin/complaints/messages', {
                method: 'POST', headers, body: JSON.stringify({ complaintId: thread.id, content: reply.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { setThreadError(data.error || 'Gönderilemedi.'); return; }
            setReply('');
            await loadThread(thread);
            load();
        } finally { setSending(false); }
    };

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Şikayet & Öneriler</h2>
                <p className="text-muted-foreground">Kullanıcı talepleri. Durum değiştirince kullanıcıya bildirim gider.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {FILTERS.map(f => (
                    <Button key={f.key} size="sm" variant={status === f.key ? 'default' : 'outline'} onClick={() => { setPage(1); setStatus(f.key); }}>
                        {f.label} ({f.key ? counts[f.key] ?? 0 : total})
                    </Button>
                ))}
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Bu filtrede talep yok.</p>
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                            <tr className="border-b">
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Kullanıcı</th>
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Talep</th>
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tarih</th>
                                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(c => (
                                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors align-top">
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="font-semibold">{c.user.fullName || c.user.username}</div>
                                        <div className="text-xs text-muted-foreground">#{c.user.id} @{c.user.username}</div>
                                    </td>
                                    <td className="px-5 py-4 max-w-xl">
                                        <Badge variant="secondary" className="mb-1">{c.category}</Badge>
                                        <div className="whitespace-pre-wrap break-words">{c.description}</div>
                                        {c.imageUrls.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {c.imageUrls.map(url => (
                                                    <a key={url} href={url} target="_blank" rel="noreferrer">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={url} alt="Ek" className="h-16 w-16 rounded-md border object-cover hover:opacity-80" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">{new Date(c.createdAt).toLocaleString('tr-TR')}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <select
                                                className="h-8 rounded-md border bg-background px-2 text-sm"
                                                value={c.status}
                                                disabled={busyId === c.id}
                                                onChange={e => changeStatus(c.id, e.target.value)}
                                            >
                                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                            {busyId === c.id && <Loader2 className="h-4 w-4 animate-spin" />}
                                        </div>
                                        <Button size="sm" variant="outline" className="h-8 mt-2" onClick={() => openThread(c)}>
                                            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Konuşma ({c.messageCount})
                                            {c.awaitingSupport && <span className="ml-2 h-2 w-2 rounded-full bg-rose-500" title="Cevap bekliyor" />}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Önceki</Button>
                    <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sonraki</Button>
                </div>
            )}

            <Dialog open={!!thread} onOpenChange={open => { if (!open) setThread(null); }}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{thread?.category}</DialogTitle>
                        <DialogDescription>
                            {thread && `${thread.user.fullName || thread.user.username} (#${thread.user.id})`}
                            {thread?.status === 'completed' && ' · Tamamlandı: kullanıcı mesaj yazamaz, siz yazabilirsiniz'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-96 overflow-auto space-y-3 py-2">
                        {threadLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                        ) : messages.map(m => (
                            <div key={m.id} className={`flex ${m.sender_type === 'support' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg border px-3 py-2 text-sm ${m.sender_type === 'support' ? 'bg-primary/10 border-primary/20' : 'bg-muted/40'}`}>
                                    <div className="text-xs text-muted-foreground mb-1">
                                        {m.sender.name} · {new Date(m.created_at).toLocaleString('tr-TR')}
                                    </div>
                                    {m.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                                    {m.image_urls.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {m.image_urls.map(url => (
                                                <a key={url} href={url} target="_blank" rel="noreferrer">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={url} alt="Ek" className="h-16 w-16 rounded-md border object-cover hover:opacity-80" />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {threadError && <p className="text-sm text-rose-600">{threadError}</p>}
                    <div className="flex gap-2">
                        <textarea
                            className="flex-1 min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
                            placeholder="Destek ekibi olarak cevap yazın..."
                            maxLength={1000}
                            value={reply}
                            onChange={e => setReply(e.target.value)}
                        />
                        <Button onClick={sendReply} disabled={sending || !reply.trim()} className="self-end">
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
