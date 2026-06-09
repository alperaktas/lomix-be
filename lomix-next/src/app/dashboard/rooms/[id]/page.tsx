"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Loader2, ArrowLeft, Crown, Lock, Users, Mic, MicOff,
    MessageSquare, ShieldAlert, History, XCircle, UserX, RefreshCcw,
    Headphones, PhoneOff, Pencil, Check, X, Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

type RoomDetail = {
    id: number;
    roomId: string;
    name: string;
    type: string;
    isLive: boolean;
    isClosed: boolean;
    isVip: boolean;
    isLocked: boolean;
    micCount: number;
    viewerCount: number;
    createdAt: string;
    owner: { id: number; username: string; avatar: string | null; email: string };
    participants: Array<{ id: number; user: { id: number; username: string; avatar: string | null; level: number; isVip: boolean } }>;
    micSlots: Array<{ id: number; slotIndex: number; label: string; isLocked: boolean; isMuted: boolean; userId: number | null; user: { id: number; username: string; avatar: string | null } | null }>;
    messages: Array<{ id: number; message: string; emoji: string | null; createdAt: string; user: { id: number; username: string } }>;
    reports: Array<{ id: number; reason: string; status: string; createdAt: string; reporter: { id: number; username: string } }>;
    adminLogs: Array<{ id: number; action: string; details: string | null; createdAt: string; targetId: number | null; admin: { id: number; username: string } }>;
};

const TABS = ['Katılımcılar', 'Mikrofon Slotları', 'Mesajlar', 'Raporlar', 'Admin Log'] as const;
type Tab = typeof TABS[number];

export default function RoomDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [room, setRoom] = useState<RoomDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('Katılımcılar');
    const [kickingUserId, setKickingUserId] = useState<number | null>(null);
    const [closingRoom, setClosingRoom] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [micCountEdit, setMicCountEdit] = useState<number | null>(null);
    const [micCountSaving, setMicCountSaving] = useState(false);
    const [editDialog, setEditDialog] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '', thumbnailUrl: '' });
    const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
    const [editThumbnailPreview, setEditThumbnailPreview] = useState('');
    const [editThumbnailUploading, setEditThumbnailUploading] = useState(false);
    const [editTempThumbnailUrl, setEditTempThumbnailUrl] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    const [isListening, setIsListening] = useState(false);
    const [listenLoading, setListenLoading] = useState(false);
    const agoraClientRef = useRef<any>(null);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    const fetchRoom = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/rooms/${id}`, { headers: { Authorization: 'Bearer ' + token } });
            if (res.ok) setRoom(await res.json());
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoom();
        // Dinleme modunda chat 2sn, normal modda 5sn polling
        const interval = setInterval(() => fetchRoom(true), isListening ? 2000 : 5000);
        return () => clearInterval(interval);
    }, [id, isListening]);

    // Yeni mesaj gelince chat panelini en alta kaydır
    useEffect(() => {
        if (isListening) {
            chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [room?.messages.length, isListening]);

    const getAdminId = () => {
        try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { return null; }
    };

    const doAction = async (action: string, extra: Record<string, any> = {}) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/rooms/${id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ action, adminId: getAdminId(), ...extra }),
            });
            await fetchRoom();
        } finally {
            setActionLoading(false);
        }
    };

    const handleMuteToggle = (slot: RoomDetail['micSlots'][0]) =>
        doAction(slot.isMuted ? 'unmute' : 'mute', { slotIndex: slot.slotIndex });

    const handleKick = async () => {
        if (!kickingUserId) return;
        await doAction('kick', { targetUserId: kickingUserId });
        setKickingUserId(null);
    };

    const handleCloseRoom = async () => {
        await doAction('close');
        setClosingRoom(false);
    };

    const handleMicCountSave = async () => {
        if (micCountEdit === null || micCountEdit === room?.micCount) return;
        setMicCountSaving(true);
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/rooms/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ micCount: micCountEdit }),
            });
            await fetchRoom();
            setMicCountEdit(null);
        } finally {
            setMicCountSaving(false);
        }
    };

    const uploadRoomThumbnail = async (file: File) => {
        setEditThumbnailUploading(true);
        try {
            const token = localStorage.getItem('token');
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd });
            const data = await res.json();
            if (data.url) {
                if (editTempThumbnailUrl) {
                    await fetch('/api/admin/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ url: editTempThumbnailUrl }) });
                }
                setEditTempThumbnailUrl(data.url);
                setEditThumbnailPreview(data.url);
                setEditForm(f => ({ ...f, thumbnailUrl: data.url }));
            }
        } finally { setEditThumbnailUploading(false); }
    };

    const cancelRoomEdit = async () => {
        if (editTempThumbnailUrl) {
            const token = localStorage.getItem('token');
            await fetch('/api/admin/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ url: editTempThumbnailUrl }) });
        }
        setEditDialog(false);
        setEditTempThumbnailUrl('');
        setEditThumbnailPreview('');
        setEditThumbnailFile(null);
    };

    const handleRoomEdit = async () => {
        setEditSaving(true);
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/rooms/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({
                    name: editForm.name || undefined,
                    description: editForm.description || undefined,
                    thumbnailUrl: editForm.thumbnailUrl || undefined,
                }),
            });
            setEditDialog(false);
            setEditTempThumbnailUrl('');
            await fetchRoom();
        } finally {
            setEditSaving(false);
        }
    };

    const handleAdminJoin = async () => {
        setListenLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/rooms/${id}/admin-join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ adminId: getAdminId() }),
            });
            if (!res.ok) { alert('Odaya katılınamadı'); return; }
            const data = await res.json();

            const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
            const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            agoraClientRef.current = client;

            // Remote kullanıcı ses yayınladığında subscribe et ve çal
            client.on('user-published', async (user: any, mediaType: 'audio' | 'video') => {
                await client.subscribe(user, mediaType);
                if (mediaType === 'audio') {
                    user.audioTrack?.play();
                }
            });

            await client.join(data.app_id, data.channel_name, data.agora_token, data.uid);
            setIsListening(true);
        } catch (err) {
            console.error(err);
            alert('Bağlantı hatası');
        } finally {
            setListenLoading(false);
        }
    };

    const handleAdminLeave = async () => {
        try {
            if (agoraClientRef.current) {
                await agoraClientRef.current.leave();
                agoraClientRef.current = null;
            }
            setIsListening(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleReport = async (reportId: number, status: string, closeRoom = false) => {
        const token = localStorage.getItem('token');
        await fetch(`/api/rooms/reports/${reportId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ status, closeRoom }),
        });
        fetchRoom();
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
    );

    if (!room) return (
        <div className="p-6 text-zinc-500">Oda bulunamadı.</div>
    );

    const pendingReports = room.reports.filter(r => r.status === 'pending');

    const tabContent = (
        <div>
            {activeTab === 'Katılımcılar' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {room.participants.length === 0 ? (
                        <p className="text-sm text-zinc-400 col-span-3">Henüz katılımcı yok.</p>
                    ) : room.participants.map(p => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600 border border-zinc-200">
                                    {p.user.username[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-zinc-800">{p.user.username}</p>
                                    <p className="text-[11px] text-zinc-400">Lvl {p.user.level}{p.user.isVip ? ' · VIP' : ''}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => setKickingUserId(p.user.id)} disabled={actionLoading}>
                                <UserX className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'Mikrofon Slotları' && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
                        <Mic className="h-4 w-4 text-zinc-400 shrink-0" />
                        <span className="text-sm text-zinc-600">Toplam Mikrofon Sayısı</span>
                        <div className="ml-auto flex items-center gap-2">
                            {micCountEdit === null ? (
                                <>
                                    <span className="text-sm font-bold text-zinc-900">{room.micCount}</span>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                        onClick={() => setMicCountEdit(room.micCount)}>
                                        <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <select
                                        value={micCountEdit}
                                        onChange={e => setMicCountEdit(Number(e.target.value))}
                                        className="h-7 rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                    >
                                        {[2, 4, 6, 8, 10, 12, 16].map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                    <Button size="sm" className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={handleMicCountSave} disabled={micCountSaving}>
                                        {micCountSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                        onClick={() => setMicCountEdit(null)} disabled={micCountSaving}>
                                        <X className="h-3.5 w-3.5 text-zinc-400" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {room.micSlots.map(slot => (
                            <div key={slot.id} className="rounded-lg border border-zinc-200 bg-white p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${slot.isLocked ? 'bg-zinc-100 border-zinc-200' : slot.isMuted ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                        {slot.isLocked ? <Lock className="h-3.5 w-3.5 text-zinc-400" /> :
                                            slot.isMuted ? <MicOff className="h-3.5 w-3.5 text-rose-500" /> :
                                                <Mic className="h-3.5 w-3.5 text-emerald-600" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-800">{slot.label}</p>
                                        <p className="text-[11px] text-zinc-400">{slot.user?.username || 'Boş'}</p>
                                    </div>
                                </div>
                                {!slot.isLocked && (
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                        onClick={() => handleMuteToggle(slot)} disabled={actionLoading}>
                                        {slot.isMuted ? 'Aç' : 'Kapat'}
                                    </Button>
                                )}
                            </div>
                        ))}
                        {room.micSlots.length === 0 && <p className="text-sm text-zinc-400">Mic slot bulunamadı.</p>}
                    </div>
                </div>
            )}

            {activeTab === 'Mesajlar' && (
                <div className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto">
                    {room.messages.length === 0 ? (
                        <p className="text-sm text-zinc-400">Henüz mesaj yok.</p>
                    ) : room.messages.map(msg => (
                        <div key={msg.id} className="flex items-start gap-2 rounded-lg bg-white border border-zinc-100 px-3 py-2">
                            <span className="text-xs font-bold text-zinc-700 shrink-0">{msg.user.username}:</span>
                            <span className="text-xs text-zinc-600">{msg.message}</span>
                            {msg.emoji && <span className="text-xs ml-auto shrink-0">{msg.emoji}</span>}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'Raporlar' && (
                <div className="flex flex-col gap-3">
                    {room.reports.length === 0 ? (
                        <p className="text-sm text-zinc-400">Rapor bulunmuyor.</p>
                    ) : room.reports.map(report => (
                        <div key={report.id} className="rounded-lg border border-zinc-200 bg-white p-4 flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-zinc-800">{report.reporter.username}</span>
                                    <Badge variant="outline" className={
                                        report.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]' :
                                            report.status === 'actioned' ? 'bg-rose-50 text-rose-700 border-rose-200 text-[10px]' :
                                                'bg-zinc-100 text-zinc-500 border-zinc-200 text-[10px]'
                                    }>
                                        {report.status === 'pending' ? 'Bekliyor' : report.status === 'actioned' ? 'İşlem Yapıldı' : 'Reddedildi'}
                                    </Badge>
                                </div>
                                <p className="text-xs text-zinc-600">{report.reason}</p>
                                <p className="text-[11px] text-zinc-400 mt-1">{new Date(report.createdAt).toLocaleDateString('tr-TR')}</p>
                            </div>
                            {report.status === 'pending' && (
                                <div className="flex gap-2 shrink-0">
                                    <Button variant="outline" size="sm" className="h-7 text-xs"
                                        onClick={() => handleReport(report.id, 'dismissed')}>
                                        Reddet
                                    </Button>
                                    <Button size="sm" className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                                        onClick={() => handleReport(report.id, 'actioned', true)}>
                                        Odayı Kapat
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'Admin Log' && (
                <div className="flex flex-col gap-2">
                    {room.adminLogs.length === 0 ? (
                        <p className="text-sm text-zinc-400">Admin işlemi bulunmuyor.</p>
                    ) : room.adminLogs.map(log => (
                        <div key={log.id} className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-white px-4 py-2.5">
                            <History className="h-4 w-4 text-zinc-400 shrink-0" />
                            <div className="flex-1">
                                <span className="text-sm font-semibold text-zinc-700">{log.admin.username}</span>
                                <span className="text-xs text-zinc-500 ml-2">{log.action}</span>
                                {log.details && <span className="text-xs text-zinc-400 ml-2">— {log.details}</span>}
                            </div>
                            <span className="text-[11px] text-zinc-400 shrink-0">{new Date(log.createdAt).toLocaleDateString('tr-TR')}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Back + Header */}
            <div className="flex items-start gap-4">
                <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => router.push('/dashboard/rooms')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">{room.name}</h1>
                        {room.isVip && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><Crown className="h-3 w-3" /> VIP</Badge>}
                        {room.isLocked && <Badge variant="outline" className="bg-zinc-50 text-zinc-600 border-zinc-200 gap-1"><Lock className="h-3 w-3" /> Kilitli</Badge>}
                        {room.isLive && !room.isClosed && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Canlı</Badge>}
                        {room.isClosed && <Badge variant="outline" className="bg-zinc-100 text-zinc-500 border-zinc-200">Kapalı</Badge>}
                        {isListening && (
                            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 gap-1 animate-pulse">
                                <Volume2 className="h-3 w-3" /> Dinleniyor
                            </Badge>
                        )}
                        {pendingReports.length > 0 && <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">{pendingReports.length} bekleyen rapor</Badge>}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">{room.roomId} · {room.type === 'video' ? 'Video' : 'Sesli'} · Sahip: <strong>{room.owner.username}</strong></p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => fetchRoom()} disabled={loading}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => { setEditForm({ name: room.name, description: (room as any).description || '', thumbnailUrl: (room as any).thumbnailUrl || '' }); setEditDialog(true); }}>
                        <Pencil className="h-4 w-4" /> Düzenle
                    </Button>
                    {room.isLive && !room.isClosed && (
                        isListening ? (
                            <Button size="sm" className="h-9 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold" onClick={handleAdminLeave}>
                                <PhoneOff className="h-4 w-4" /> Ayrıl
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" className="h-9 gap-1.5 font-semibold" onClick={handleAdminJoin} disabled={listenLoading}>
                                {listenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Headphones className="h-4 w-4" />}
                                Gizli Katıl
                            </Button>
                        )
                    )}
                    {room.isLive && !room.isClosed && (
                        <Button size="sm" className="h-9 bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5" onClick={() => setClosingRoom(true)}>
                            <XCircle className="h-4 w-4" /> Odayı Kapat
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Katılımcı', value: room.participants.length, icon: Users },
                    { label: 'Mikrofon', value: `${room.micSlots.length}/${room.micCount}`, icon: Mic },
                    { label: 'Mesaj', value: room.messages.length, icon: MessageSquare },
                    { label: 'Rapor', value: room.reports.length, icon: ShieldAlert },
                ].map(s => (
                    <div key={s.label} className="rounded-lg border border-zinc-200 bg-white p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-zinc-100 flex items-center justify-center">
                            <s.icon className="h-4 w-4 text-zinc-500" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-zinc-900">{s.value}</p>
                            <p className="text-xs text-zinc-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Dinleme modu: Mic + Katılımcılar solda, Chat sağda */}
            {isListening ? (
                <div className="flex gap-4 items-start">
                    {/* Sol: Oda Görünümü */}
                    <div className="flex-1 min-w-0 flex flex-col gap-4">

                        {/* Mic Slotları */}
                        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-100 bg-zinc-50">
                                <Mic className="h-4 w-4 text-zinc-500" />
                                <span className="text-sm font-semibold text-zinc-700">Mikrofon Slotları</span>
                                <span className="ml-auto text-[11px] text-zinc-400">
                                    {room.micSlots.filter(s => s.userId).length} / {room.micSlots.length} dolu
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3">
                                {room.micSlots.map(slot => (
                                    <div key={slot.id} className={`rounded-lg border p-3 flex flex-col items-center gap-2 transition-colors ${
                                        slot.isLocked ? 'bg-zinc-50 border-zinc-200' :
                                        slot.isMuted ? 'bg-rose-50 border-rose-200' :
                                        slot.userId ? 'bg-emerald-50 border-emerald-200' :
                                        'bg-white border-zinc-100'
                                    }`}>
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                                            slot.isLocked ? 'bg-zinc-100 border-zinc-300' :
                                            slot.isMuted ? 'bg-rose-100 border-rose-300' :
                                            slot.userId ? 'bg-emerald-100 border-emerald-300' :
                                            'bg-zinc-100 border-zinc-200'
                                        }`}>
                                            {slot.isLocked
                                                ? <Lock className="h-4 w-4 text-zinc-400" />
                                                : slot.isMuted
                                                    ? <MicOff className="h-4 w-4 text-rose-500" />
                                                    : slot.userId
                                                        ? <span className="text-sm font-bold text-emerald-700">{slot.user?.username[0].toUpperCase()}</span>
                                                        : <Mic className="h-4 w-4 text-zinc-300" />
                                            }
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[11px] font-semibold text-zinc-700 truncate max-w-[80px]">
                                                {slot.user?.username || slot.label}
                                            </p>
                                            <p className="text-[10px] text-zinc-400">
                                                {slot.isLocked ? 'Kilitli' : slot.isMuted ? 'Sessiz' : slot.userId ? 'Aktif' : 'Boş'}
                                            </p>
                                        </div>
                                        {!slot.isLocked && slot.userId && (
                                            <div className="flex gap-1 w-full">
                                                <Button
                                                    variant="ghost" size="sm"
                                                    className={`flex-1 h-6 text-[10px] font-semibold ${slot.isMuted ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-500 hover:bg-rose-50'}`}
                                                    onClick={() => handleMuteToggle(slot)} disabled={actionLoading}>
                                                    {slot.isMuted ? 'Aç' : 'Kapat'}
                                                </Button>
                                                <Button
                                                    variant="ghost" size="sm"
                                                    className="flex-1 h-6 text-[10px] font-semibold text-rose-500 hover:bg-rose-50"
                                                    onClick={() => setKickingUserId(slot.userId!)} disabled={actionLoading}>
                                                    At
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Katılımcılar */}
                        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-100 bg-zinc-50">
                                <Users className="h-4 w-4 text-zinc-500" />
                                <span className="text-sm font-semibold text-zinc-700">Katılımcılar</span>
                                <span className="ml-auto text-[11px] text-zinc-400">{room.participants.length} kişi</span>
                            </div>
                            <div className="flex flex-wrap gap-2 p-3">
                                {room.participants.length === 0 ? (
                                    <p className="text-xs text-zinc-400 w-full text-center py-2">Henüz katılımcı yok.</p>
                                ) : room.participants.map(p => (
                                    <div key={p.id} className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-1.5 group">
                                        <div className="h-6 w-6 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                                            {p.user.username[0].toUpperCase()}
                                        </div>
                                        <span className="text-xs font-medium text-zinc-700">{p.user.username}</span>
                                        <Button variant="ghost" size="sm"
                                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                            onClick={() => setKickingUserId(p.user.id)} disabled={actionLoading}>
                                            <UserX className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Raporlar / Admin Log sekmesi (küçük) */}
                        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                            <div className="flex border-b border-zinc-100">
                                {(['Raporlar', 'Admin Log'] as Tab[]).map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
                                        {tab}
                                        {tab === 'Raporlar' && pendingReports.length > 0 && (
                                            <span className="ml-1 text-[9px] bg-rose-500 text-white rounded-full px-1.5 py-0.5">{pendingReports.length}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="p-3 max-h-48 overflow-y-auto">
                                {tabContent}
                            </div>
                        </div>
                    </div>

                    {/* Sağ: Canlı Chat Paneli */}
                    <div className="w-80 shrink-0 flex flex-col rounded-xl border border-violet-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 border-b border-violet-100">
                            <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-sm font-semibold text-violet-800">Canlı Chat</span>
                            <span className="ml-auto text-[11px] text-violet-500">{room.messages.length} mesaj</span>
                        </div>
                        <div className="flex flex-col gap-1 p-3 h-[620px] overflow-y-auto">
                            {room.messages.length === 0 ? (
                                <p className="text-xs text-zinc-400 text-center mt-8">Henüz mesaj yok.</p>
                            ) : room.messages.map(msg => (
                                <div key={msg.id} className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[11px] font-bold text-violet-700">{msg.user.username}</span>
                                        <span className="text-[10px] text-zinc-400 ml-auto">
                                            {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-700">{msg.message}</p>
                                    {msg.emoji && <span className="text-sm">{msg.emoji}</span>}
                                </div>
                            ))}
                            <div ref={chatBottomRef} />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Normal mod: standart tabs */}
                    <div className="border-b border-zinc-200 flex gap-0">
                        {TABS.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
                                {tab}
                                {tab === 'Raporlar' && pendingReports.length > 0 && (
                                    <span className="ml-1.5 text-[10px] bg-rose-500 text-white rounded-full px-1.5 py-0.5">{pendingReports.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    {tabContent}
                </>
            )}

            {/* Kick Confirm */}
            <Dialog open={!!kickingUserId} onOpenChange={(o) => { if (!o) setKickingUserId(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <div className="flex flex-col items-center text-center gap-4 py-2">
                        <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                            <UserX className="h-7 w-7 text-rose-600" />
                        </div>
                        <DialogHeader className="items-center">
                            <DialogTitle>Kullanıcıyı At</DialogTitle>
                            <DialogDescription className="max-w-[240px]">Bu kullanıcı odadan çıkarılacak.</DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 w-full pt-2 border-t border-zinc-100">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setKickingUserId(null)}>İptal</Button>
                            <Button variant="destructive" size="sm" className="flex-1 font-semibold" onClick={handleKick} disabled={actionLoading}>At</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Close Room Confirm */}
            <Dialog open={closingRoom} onOpenChange={setClosingRoom}>
                <DialogContent className="sm:max-w-sm">
                    <div className="flex flex-col items-center text-center gap-4 py-2">
                        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                            <XCircle className="h-7 w-7 text-amber-600" />
                        </div>
                        <DialogHeader className="items-center">
                            <DialogTitle>Odayı Kapat</DialogTitle>
                            <DialogDescription className="max-w-[240px]">Oda kapatılacak ve canlı yayın sonlandırılacak.</DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 w-full pt-2 border-t border-zinc-100">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setClosingRoom(false)}>İptal</Button>
                            <Button size="sm" className="flex-1 font-semibold bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCloseRoom} disabled={actionLoading}>Kapat</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Oda Düzenle Dialog */}
            <Dialog open={editDialog} onOpenChange={open => { if (!open) cancelRoomEdit(); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Odayı Düzenle</DialogTitle>
                        <DialogDescription>Oda adı, açıklaması ve kapak resmini güncelle.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Oda Adı</label>
                            <input
                                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950"
                                value={editForm.name}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Oda adı"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Açıklama</label>
                            <textarea
                                className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 resize-none"
                                rows={3}
                                value={editForm.description}
                                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Oda açıklaması..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Kapak Resmi</label>
                            {(editThumbnailPreview || editForm.thumbnailUrl) && (
                                <img src={editThumbnailPreview || editForm.thumbnailUrl} alt="" className="h-24 w-full object-cover rounded-lg border border-zinc-200" />
                            )}
                            <label className="cursor-pointer block">
                                <div className="flex h-9 w-full items-center rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-500 hover:bg-zinc-50 cursor-pointer">
                                    {editThumbnailUploading
                                        ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Yükleniyor...</>
                                        : editThumbnailFile ? editThumbnailFile.name : 'Fotoğraf seç...'}
                                </div>
                                <input type="file" accept="image/*" className="hidden" disabled={editThumbnailUploading}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) { setEditThumbnailFile(f); uploadRoomThumbnail(f); } }} />
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                            <Button variant="ghost" size="sm" onClick={cancelRoomEdit}>İptal</Button>
                            <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 font-semibold" onClick={handleRoomEdit} disabled={editSaving || editThumbnailUploading}>
                                {editSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kaydet
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
