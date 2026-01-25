"use client";

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';

interface Role {
    id: number;
    name: string;
}

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');

    // Edit States
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [editRoleName, setEditRoleName] = useState('');

    // Delete State
    const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);

    const fetchRoles = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/roles', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const data = await res.json();
                setRoles(data);
            }
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

    // EKLEME
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
            } else {
                alert('Ekleme başarısız');
            }
        } catch (err) { console.error(err); }
    };

    // DÜZENLEME (AÇ)
    const openEditModal = (role: Role) => {
        setEditingRole(role);
        setEditRoleName(role.name);
    };

    // DÜZENLEME (KAYDET)
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
            } else {
                alert('Güncelleme başarısız');
            }
        } catch (err) { console.error(err); }
    };

    // SİLME
    const confirmDelete = async () => {
        if (!deletingRoleId) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/roles/${deletingRoleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });

            // Response status kontrolü
            if (res.ok) {
                setRoles(prev => prev.filter(r => r.id !== deletingRoleId));
                setDeletingRoleId(null);
            } else {
                const err = await res.json();
                alert('Silinemedi: ' + (err.message || 'Bilinmeyen hata'));
            }
        } catch (err) { console.error(err); alert('Bağlantı hatası'); }
    };

    if (loading) return <div>Yükleniyor...</div>;

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Rol Yönetimi</h3>
                <div className="card-actions">
                    <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>Yeni Rol Ekle</button>
                </div>
            </div>
            <div className="table-responsive">
                <table className="table card-table table-vcenter text-nowrap">
                    <thead>
                        <tr>
                            <th className="w-1">ID</th>
                            <th>Rol Adı</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map((role) => (
                            <tr key={role.id}>
                                <td>{role.id}</td>
                                <td>{role.name}</td>
                                <td>
                                    <button
                                        className="btn btn-sm btn-outline-primary me-2"
                                        onClick={() => openEditModal(role)}
                                    >
                                        Düzenle
                                    </button>
                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => setDeletingRoleId(role.id)}
                                    >
                                        Sil
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ADD MODAL */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Rol Ekle">
                <form onSubmit={handleAddRole}>
                    <div className="mb-3">
                        <label className="form-label">Rol Adı</label>
                        <input type="text" className="form-control" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} required />
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-link link-secondary" onClick={() => setIsAddModalOpen(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary">Kaydet</button>
                    </div>
                </form>
            </Modal>

            {/* EDIT MODAL */}
            <Modal isOpen={!!editingRole} onClose={() => setEditingRole(null)} title="Rolü Düzenle">
                <form onSubmit={handleUpdateRole}>
                    <div className="mb-3">
                        <label className="form-label">Rol Adı</label>
                        <input type="text" className="form-control" value={editRoleName} onChange={e => setEditRoleName(e.target.value)} required />
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-link link-secondary" onClick={() => setEditingRole(null)}>İptal</button>
                        <button type="submit" className="btn btn-primary">Güncelle</button>
                    </div>
                </form>
            </Modal>

            {/* DELETE MODAL */}
            <Modal isOpen={!!deletingRoleId} onClose={() => setDeletingRoleId(null)} title="Rol Sil?" size="sm" footer={
                <>
                    <button className="btn btn-link link-secondary me-auto" onClick={() => setDeletingRoleId(null)}>İptal</button>
                    <button className="btn btn-danger" onClick={confirmDelete}>Evet, Sil</button>
                </>
            }>
                <p>Bu rolü silmek istediğinize emin misiniz?</p>
            </Modal>
        </div>
    );
}
