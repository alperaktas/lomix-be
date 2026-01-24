"use client";

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // --- STATES ---
    // ADD
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user', status: 'active' });

    // EDIT
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ username: '', email: '', role: 'user', status: 'active', password: '' });

    // DELETE
    const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users', { headers: { 'Authorization': 'Bearer ' + token } });
            if (res.ok) setUsers(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    // EKLEME
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
                alert('Kullanıcı eklendi');
                setNewUser({ username: '', email: '', password: '', role: 'user', status: 'active' }); // Reset
                setIsAddModalOpen(false);
                fetchUsers();
            } else {
                const err = await res.json();
                alert('Hata: ' + err.message);
            }
        } catch (error) { console.error(error); }
    };

    // FİLTRELEME
    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // DELETE ve UPDATE (Önceki kodlardan aynı mantıkla fonksiyonlar)
    const openDeleteConfirm = (id: number) => setDeletingUserId(id);
    const confirmDelete = async () => {
        if (!deletingUserId) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/users/${deletingUserId}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        if (res.ok) {
            setUsers(p => p.filter(u => u.id !== deletingUserId));
            setDeletingUserId(null);
        } else { alert('Silinemedi'); }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditForm({ username: user.username, email: user.email, role: user.role, status: user.status || 'active', password: '' });
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

    if (loading) return <div>Yükleniyor...</div>;

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Kullanıcı Listesi</h3>
                <div className="card-actions d-flex gap-2">
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ara..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        + Yeni Kullanıcı
                    </button>
                </div>
            </div>
            <div className="table-responsive">
                <table className="table card-table table-vcenter text-nowrap datatable">
                    <thead>
                        <tr>
                            <th className="w-1">ID</th>
                            <th>Kullanıcı Adı</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Durum</th>
                            <th>Kayıt Tarihi</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td><span className="text-muted">{user.id}</span></td>
                                <td>{user.username}</td>
                                <td>{user.email}</td>
                                <td><span className={`badge ${user.role === 'admin' ? 'bg-red-lt' : 'bg-blue-lt'}`}>{user.role}</span></td>
                                <td><span className={`badge ${user.status === 'active' ? 'bg-success' : 'bg-warning'}`}>{user.status || 'Bilinmiyor'}</span></td>
                                <td>{new Date(user.createdAt).toLocaleDateString('tr-TR')}</td>
                                <td>
                                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEditModal(user)}>Düzenle</button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => openDeleteConfirm(user.id)}>Sil</button>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && <tr><td colSpan={7} className="text-center text-muted">Kayıt bulunamadı.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* ADD MODAL */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Kullanıcı Ekle" size="lg">
                <form onSubmit={handleAddUser}>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Kullanıcı Adı</label>
                            <input type="text" className="form-control" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-control" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Şifre</label>
                            <input type="password" className="form-control" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Rol</label>
                            <select className="form-select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="moderator">Moderator</option>
                            </select>
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Durum</label>
                            <select className="form-select" value={newUser.status} onChange={e => setNewUser({ ...newUser, status: e.target.value })}>
                                <option value="active">Aktif</option>
                                <option value="pending">Bekliyor</option>
                                <option value="suspended">Askıya Alınmış</option>
                            </select>
                        </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-link link-secondary" onClick={() => setIsAddModalOpen(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary">Kaydet</button>
                    </div>
                </form>
            </Modal>

            {/* EDIT and DELETE Modals (Previously implemented, keeping concise) */}
            <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Kullanıcı Düzenle" size="lg">
                <form onSubmit={handleUpdate}>
                    <div className="mb-3"><label className="form-label">Kullanıcı Adı</label><input type="text" className="form-control" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} required /></div>
                    <div className="mb-3"><label className="form-label">Email</label><input type="email" className="form-control" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required /></div>
                    <div className="mb-3"><label className="form-label">Rol</label><select className="form-select" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option></select></div>
                    <div className="mb-3"><label className="form-label">Durum</label><select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}><option value="active">Aktif</option><option value="pending">Bekliyor</option><option value="suspended">Askıya Alınmış</option></select></div>
                    <div className="mb-3"><label className="form-label">Yeni Şifre</label><input type="password" className="form-control" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} /></div>
                    <div className="d-flex justify-content-end gap-2"><button type="submit" className="btn btn-primary">Güncelle</button></div>
                </form>
            </Modal>
            <Modal isOpen={!!deletingUserId} onClose={() => setDeletingUserId(null)} title="Kullanıcı Sil?" size="sm" footer={<><button className="btn btn-link link-secondary me-auto" onClick={() => setDeletingUserId(null)}>İptal</button><button className="btn btn-danger" onClick={confirmDelete}>Evet, Sil</button></>}>
                <p>Silmek istediğinize emin misiniz?</p>
            </Modal>
        </div>
    );
}
