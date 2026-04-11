"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCcw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { getColumns, Role } from './columns';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [editRoleName, setEditRoleName] = useState('');
    const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/roles', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) setRoles(await res.json());
        } catch (err) {
            console.error("Roller getirilemedi", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }
        fetchRoles();
    }, []);

    // CRUD
    const handleAddRole = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ name: newRoleName })
            });
            if (res.ok) {
                setNewRoleName('');
                setIsAddModalOpen(false);
                fetchRoles();
            } else { alert('Ekleme başarısız'); }
        } catch (err) { console.error(err); }
    };

    const handleUpdateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/roles/${editingRole.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ name: editRoleName })
            });
            if (res.ok) {
                setEditingRole(null);
                fetchRoles();
            } else { alert('Güncelleme başarısız'); }
        } catch (err) { console.error(err); }
    };

    const confirmDelete = async () => {
        if (!deletingRoleId) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/roles/${deletingRoleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                setRoles(prev => prev.filter(r => r.id !== deletingRoleId));
                setDeletingRoleId(null);
            } else {
                const err = await res.json();
                alert('Silinemedi: ' + (err.message || 'Bilinmeyen hata'));
            }
        } catch (err) { console.error(err); alert('Bağlantı hatası'); }
    };

    const columns = getColumns({
        onEdit: (role) => {
            setEditingRole(role);
            setEditRoleName(role.name);
        },
        onDelete: (id) => setDeletingRoleId(id),
    });

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Rol Yönetimi</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Sistemde kayıtlı {roles.length} rol bulunmaktadır.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3"
                        onClick={fetchRoles}
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
                        Yeni Rol
                    </Button>
                </div>
            </div>

            {/* Table */}
            {loading && roles.length === 0 ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
            ) : (
                <DataTable columns={columns} data={roles} />
            )}

            {/* ───── ADD ROLE DIALOG ───── */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Yeni Rol Ekle</DialogTitle>
                        <DialogDescription>Sisteme yeni bir rol tanımı ekleyin.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddRole} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Rol Adı</label>
                            <Input className="h-9" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="örn: editor" required />
                        </div>
                        <DialogFooter className="pt-2 border-t border-zinc-100">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>İptal</Button>
                            <Button type="submit" size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 px-6 font-semibold">Kaydet</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ───── EDIT ROLE DIALOG ───── */}
            <Dialog open={!!editingRole} onOpenChange={(open) => { if (!open) setEditingRole(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Rolü Düzenle</DialogTitle>
                        <DialogDescription>Rol adını güncelleyebilirsiniz.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateRole} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Rol Adı</label>
                            <Input className="h-9" value={editRoleName} onChange={e => setEditRoleName(e.target.value)} required />
                        </div>
                        <DialogFooter className="pt-2 border-t border-zinc-100">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingRole(null)}>Vazgeç</Button>
                            <Button type="submit" size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 px-6 font-semibold">Güncelle</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ───── DELETE CONFIRM DIALOG ───── */}
            <Dialog open={!!deletingRoleId} onOpenChange={(open) => { if (!open) setDeletingRoleId(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <div className="flex flex-col items-center text-center gap-4 py-2">
                        <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                            <Trash2 className="h-7 w-7 text-rose-600" />
                        </div>
                        <DialogHeader className="items-center">
                            <DialogTitle className="text-lg font-semibold">Emin misiniz?</DialogTitle>
                            <DialogDescription className="max-w-[240px]">
                                Bu rol kalıcı olarak silinecek. Bu işlem geri alınamaz.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 w-full pt-2 border-t border-zinc-100">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeletingRoleId(null)}>İptal</Button>
                            <Button variant="destructive" size="sm" className="flex-1 font-semibold" onClick={confirmDelete}>Evet, Sil</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
