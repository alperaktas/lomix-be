"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCcw, Search as SearchIcon, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { getColumns, User } from './columns';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user', status: 'active' });
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ username: '', email: '', role: 'user', status: 'active', password: '' });
    const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users', { headers: { 'Authorization': 'Bearer ' + token } });
            if (res.ok) setUsers(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    // CRUD handlers
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(newUser)
            });
            if (res.ok) {
                setNewUser({ username: '', email: '', password: '', role: 'user', status: 'active' });
                setIsAddModalOpen(false);
                fetchUsers();
            } else {
                const err = await res.json();
                alert('Hata: ' + err.message);
            }
        } catch (error) { console.error(error); }
    };

    const confirmDelete = async () => {
        if (!deletingUserId) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/users/${deletingUserId}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        if (res.ok) {
            setUsers(p => p.filter(u => u.id !== deletingUserId));
            setDeletingUserId(null);
        } else { alert('Silinemedi'); }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/users/${editingUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(editForm)
        });
        if (res.ok) {
            setEditingUser(null);
            fetchUsers();
        } else { alert('Güncelleme başarısız'); }
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = getColumns({
        onEdit: (user) => {
            setEditingUser(user);
            setEditForm({ username: user.username, email: user.email, role: user.role, status: user.status || 'active', password: '' });
        },
        onDelete: (id) => setDeletingUserId(id)
    });

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Kullanıcı Yönetimi</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Toplam {users.length} kayıtlı kullanıcı
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                            placeholder="Ara..."
                            className="pl-10 h-9 text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3"
                        onClick={fetchUsers}
                        disabled={loading}
                    >
                        <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    <Button
                        size="sm"
                        className="h-9 gap-1.5 px-4 bg-zinc-900 text-white hover:bg-zinc-800 font-semibold"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <Plus className="h-4 w-4" />
                        Yeni Kullanıcı
                    </Button>
                </div>
            </div>

            {/* Table */}
            {loading && users.length === 0 ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
            ) : (
                <DataTable columns={columns} data={filteredUsers} />
            )}

            {/* ───── ADD USER DIALOG ───── */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Yeni Kullanıcı Ekle</DialogTitle>
                        <DialogDescription>Sisteme yeni bir kullanıcı eklemek için aşağıdaki formu doldurun.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Kullanıcı Adı</label>
                            <Input className="h-9" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Email</label>
                            <Input className="h-9" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Şifre</label>
                            <Input className="h-9" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Rol</label>
                            <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="moderator">Moderator</option>
                            </select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-semibold text-zinc-700">Durum</label>
                            <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950" value={newUser.status} onChange={e => setNewUser({ ...newUser, status: e.target.value })}>
                                <option value="active">Aktif</option>
                                <option value="pending">Bekliyor</option>
                                <option value="suspended">Askıya Alınmış</option>
                            </select>
                        </div>
                        <DialogFooter className="sm:col-span-2 pt-2 border-t border-zinc-100">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>İptal</Button>
                            <Button type="submit" size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 px-6 font-semibold">Kaydet</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ───── EDIT USER DIALOG ───── */}
            <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Kullanıcı Düzenle</DialogTitle>
                        <DialogDescription>Kullanıcı bilgilerini aşağıdan güncelleyebilirsiniz.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Kullanıcı Adı</label>
                            <Input className="h-9" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Email</label>
                            <Input className="h-9" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Rol</label>
                            <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="moderator">Moderator</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Durum</label>
                            <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                <option value="active">Aktif</option>
                                <option value="pending">Bekliyor</option>
                                <option value="suspended">Askıya Alınmış</option>
                            </select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-semibold text-zinc-700">Yeni Şifre <span className="text-zinc-400 font-normal">(boş bırakılabilir)</span></label>
                            <Input className="h-9" type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="••••••••" />
                        </div>
                        <DialogFooter className="sm:col-span-2 pt-2 border-t border-zinc-100">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingUser(null)}>Vazgeç</Button>
                            <Button type="submit" size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 px-6 font-semibold">Güncelle</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ───── DELETE CONFIRM DIALOG ───── */}
            <Dialog open={!!deletingUserId} onOpenChange={(open) => { if (!open) setDeletingUserId(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <div className="flex flex-col items-center text-center gap-4 py-2">
                        <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                            <Trash2 className="h-7 w-7 text-rose-600" />
                        </div>
                        <DialogHeader className="items-center">
                            <DialogTitle className="text-lg font-semibold">Emin misiniz?</DialogTitle>
                            <DialogDescription className="max-w-[240px]">
                                Bu kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 w-full pt-2 border-t border-zinc-100">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeletingUserId(null)}>İptal</Button>
                            <Button variant="destructive" size="sm" className="flex-1 font-semibold" onClick={confirmDelete}>Evet, Sil</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
