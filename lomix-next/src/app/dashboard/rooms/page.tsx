"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCcw, Search as SearchIcon, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { getColumns, Room } from './columns';
import { cn } from '@/lib/utils';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [editForm, setEditForm] = useState({
        name: '', micCount: 8, isVip: false, isLocked: false, password: '',
    });
    const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null);
    const [closingRoomId, setClosingRoomId] = useState<number | null>(null);
    const router = useRouter();

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/rooms', { headers: { Authorization: 'Bearer ' + token } });
            if (res.ok) {
                const data = await res.json();
                setRooms(data.rooms);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRooms(); }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRoom) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/rooms/${editingRoom.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify(editForm),
        });
        if (res.ok) { setEditingRoom(null); fetchRooms(); }
        else alert('Güncelleme başarısız');
    };

    const confirmDelete = async () => {
        if (!deletingRoomId) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/rooms/${deletingRoomId}`, {
            method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) { setRooms(p => p.filter(r => r.id !== deletingRoomId)); setDeletingRoomId(null); }
        else alert('Silinemedi');
    };

    const confirmClose = async () => {
        if (!closingRoomId) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/rooms/${closingRoomId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ isLive: false, isClosed: true }),
        });
        if (res.ok) { setClosingRoomId(null); fetchRooms(); }
        else alert('Kapatılamadı');
    };

    const filteredRooms = rooms.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.roomId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.owner?.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = getColumns({
        onEdit: (room) => {
            setEditingRoom(room);
            setEditForm({ name: room.name, micCount: room.micCount, isVip: room.isVip, isLocked: room.isLocked, password: '' });
        },
        onDelete: (id) => setDeletingRoomId(id),
        onDetail: (id) => router.push(`/dashboard/rooms/${id}`),
        onClose: (id) => setClosingRoomId(id),
    });

    const liveCount = rooms.filter(r => r.isLive).length;

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Oda Yönetimi</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        {rooms.length} oda · <span className="text-emerald-600 font-semibold">{liveCount} canlı</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => router.push('/dashboard/rooms/reports')}>
                            Raporlar
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => router.push('/dashboard/rooms/word-filters')}>
                            Kelime Filtresi
                        </Button>
                    </div>
                    <div className="relative w-56">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                            placeholder="Ara..."
                            className="pl-10 h-9 text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="sm" className="h-9 px-3" onClick={fetchRooms} disabled={loading}>
                        <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Table */}
            {loading && rooms.length === 0 ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
            ) : (
                <DataTable columns={columns} data={filteredRooms} />
            )}

            {/* ───── EDIT DIALOG ───── */}
            <Dialog open={!!editingRoom} onOpenChange={(o) => { if (!o) setEditingRoom(null); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Oda Düzenle</DialogTitle>
                        <DialogDescription>Oda ayarlarını aşağıdan güncelleyebilirsiniz.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-semibold text-zinc-700">Oda Adı</label>
                            <Input className="h-9" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Mikrofon Sayısı</label>
                            <Input className="h-9" type="number" min={1} max={20} value={editForm.micCount} onChange={e => setEditForm({ ...editForm, micCount: parseInt(e.target.value) })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Şifre <span className="text-zinc-400 font-normal">(boş = şifresiz)</span></label>
                            <Input className="h-9" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="••••••" />
                        </div>
                        <div className="flex items-center gap-4 sm:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={editForm.isVip} onChange={e => setEditForm({ ...editForm, isVip: e.target.checked })} className="h-4 w-4 rounded" />
                                <span className="text-sm font-medium text-zinc-700">VIP Oda</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={editForm.isLocked} onChange={e => setEditForm({ ...editForm, isLocked: e.target.checked })} className="h-4 w-4 rounded" />
                                <span className="text-sm font-medium text-zinc-700">Kilitli Oda</span>
                            </label>
                        </div>
                        <DialogFooter className="sm:col-span-2 pt-2 border-t border-zinc-100">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingRoom(null)}>Vazgeç</Button>
                            <Button type="submit" size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 px-6 font-semibold">Güncelle</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ───── CLOSE CONFIRM DIALOG ───── */}
            <Dialog open={!!closingRoomId} onOpenChange={(o) => { if (!o) setClosingRoomId(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <div className="flex flex-col items-center text-center gap-4 py-2">
                        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                            <XCircle className="h-7 w-7 text-amber-600" />
                        </div>
                        <DialogHeader className="items-center">
                            <DialogTitle className="text-lg font-semibold">Odayı Kapat</DialogTitle>
                            <DialogDescription className="max-w-[240px]">
                                Bu oda kapatılacak ve canlı yayın sonlandırılacak.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 w-full pt-2 border-t border-zinc-100">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setClosingRoomId(null)}>İptal</Button>
                            <Button size="sm" className="flex-1 font-semibold bg-amber-600 hover:bg-amber-700 text-white" onClick={confirmClose}>Evet, Kapat</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ───── DELETE CONFIRM DIALOG ───── */}
            <Dialog open={!!deletingRoomId} onOpenChange={(o) => { if (!o) setDeletingRoomId(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <div className="flex flex-col items-center text-center gap-4 py-2">
                        <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                            <Trash2 className="h-7 w-7 text-rose-600" />
                        </div>
                        <DialogHeader className="items-center">
                            <DialogTitle className="text-lg font-semibold">Emin misiniz?</DialogTitle>
                            <DialogDescription className="max-w-[240px]">
                                Bu oda kalıcı olarak silinecek. Bu işlem geri alınamaz.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 w-full pt-2 border-t border-zinc-100">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeletingRoomId(null)}>İptal</Button>
                            <Button variant="destructive" size="sm" className="flex-1 font-semibold" onClick={confirmDelete}>Evet, Sil</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
