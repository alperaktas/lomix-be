"use client";

import { useEffect, useState } from 'react';
import { Loader2, Search, RefreshCcw, Trash2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserInfo { id: number; username: string; fullName: string | null; avatar: string | null }
interface Message  { id: number; text: string | null; imageUrl: string | null; isRead: boolean; createdAt: string; from: UserInfo; to: UserInfo }
interface Conversation { otherUser: UserInfo; messageCount: number; lastAt: string }

export default function MessagesPage() {
    const [mode, setMode] = useState<'search' | 'conversations' | 'messages'>('search');
    const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
    const [otherUser, setOtherUser]       = useState<UserInfo | null>(null);

    const [userIdInput,  setUserIdInput]  = useState('');
    const [otherIdInput, setOtherIdInput] = useState('');

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages,      setMessages]      = useState<Message[]>([]);
    const [loading,       setLoading]       = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    const fetchConversations = async (userId: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/messages?user_id=${userId}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setConversations(data.conversations || []);
            setMode('conversations');
        } finally { setLoading(false); }
    };

    const fetchMessages = async (userId: number, otherId: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/messages?user_id=${userId}&other_id=${otherId}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setMessages(data.messages || []);
            setMode('messages');
        } finally { setLoading(false); }
    };

    const deleteMessage = async (id: number) => {
        await fetch(`/api/admin/messages?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setMessages(prev => prev.filter(m => m.id !== id));
    };

    const handleSearch = () => {
        const uid = Number(userIdInput);
        if (!uid) return;
        if (otherIdInput) {
            fetchMessages(uid, Number(otherIdInput));
        } else {
            fetchConversations(uid);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Özel Mesajlar</h2>
                    <p className="text-muted-foreground">Kullanıcılar arası mesajları görüntüle ve yönet.</p>
                </div>
            </div>

            {/* Arama */}
            <div className="flex gap-3 items-end flex-wrap">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-600">Kullanıcı ID</label>
                    <Input className="w-36" placeholder="ör. 42" value={userIdInput} onChange={e => setUserIdInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-600">Karşı Taraf ID (opsiyonel)</label>
                    <Input className="w-36" placeholder="ör. 87" value={otherIdInput} onChange={e => setOtherIdInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                </div>
                <Button onClick={handleSearch} disabled={!userIdInput || loading}>
                    <Search className="h-4 w-4 mr-2" />
                    {otherIdInput ? 'Mesajları Göster' : 'Konuşmaları Göster'}
                </Button>
                {mode !== 'search' && (
                    <Button variant="outline" onClick={() => { setMode('search'); setConversations([]); setMessages([]); }}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Sıfırla
                    </Button>
                )}
            </div>

            {loading && (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Konuşma listesi */}
            {!loading && mode === 'conversations' && (
                <div className="rounded-xl border overflow-hidden">
                    <div className="bg-muted/40 px-4 py-2.5 border-b">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Kullanıcı #{userIdInput} konuşmaları</p>
                    </div>
                    {conversations.length === 0 ? (
                        <p className="text-center text-muted-foreground py-12 text-sm">Konuşma bulunamadı.</p>
                    ) : conversations.map(c => (
                        <div key={c.otherUser?.id} className="flex items-center gap-4 px-4 py-3 border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                            onClick={() => { setOtherUser(c.otherUser); fetchMessages(Number(userIdInput), c.otherUser.id); }}>
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={c.otherUser?.avatar || ''} />
                                <AvatarFallback>{c.otherUser?.username?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{c.otherUser?.fullName || c.otherUser?.username}</p>
                                <p className="text-xs text-zinc-400">@{c.otherUser?.username} · #{c.otherUser?.id}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs font-semibold text-zinc-600">{c.messageCount} mesaj</p>
                                <p className="text-[11px] text-zinc-400">{new Date(c.lastAt).toLocaleDateString('tr-TR')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Mesaj geçmişi */}
            {!loading && mode === 'messages' && (
                <div className="rounded-xl border overflow-hidden">
                    <div className="bg-muted/40 px-4 py-2.5 border-b flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            #{userIdInput} ↔ #{otherIdInput || otherUser?.id} — {messages.length} mesaj
                        </p>
                        <Button variant="ghost" size="sm" onClick={() => fetchMessages(Number(userIdInput), Number(otherIdInput || otherUser?.id))}>
                            <RefreshCcw className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    {messages.length === 0 ? (
                        <p className="text-center text-muted-foreground py-12 text-sm">Mesaj bulunamadı.</p>
                    ) : (
                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {messages.map(m => (
                                <div key={m.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 group transition-colors">
                                    <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                                        <AvatarImage src={m.from.avatar || ''} />
                                        <AvatarFallback className="text-[10px]">{m.from.username[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-semibold">{m.from.fullName || m.from.username}</span>
                                            <span className="text-[11px] text-zinc-400">→ {m.to.fullName || m.to.username}</span>
                                            <span className="text-[11px] text-zinc-400 ml-auto">
                                                {new Date(m.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {m.text && <p className="text-sm text-zinc-700 mt-0.5">{m.text}</p>}
                                        {m.imageUrl && (
                                            <div className="mt-1">
                                                <img src={m.imageUrl} alt="" className="max-h-32 rounded-lg object-cover border border-zinc-200" />
                                            </div>
                                        )}
                                        {!m.text && !m.imageUrl && (
                                            <p className="text-xs text-zinc-400 italic mt-0.5">Boş mesaj</p>
                                        )}
                                    </div>
                                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0 h-7 w-7 p-0 transition-opacity"
                                        onClick={() => deleteMessage(m.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
