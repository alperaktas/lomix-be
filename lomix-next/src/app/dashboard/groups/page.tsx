"use client";

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';

interface Group {
    id: number;
    name: string;
    description: string;
    _count?: { users: number };
}

export default function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);
    const [newGroup, setNewGroup] = useState({ name: '', description: '' });

    const fetchGroups = async () => {
        fetch('/api/groups', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        })
            .then(res => res.json())
            .then(data => setGroups(Array.isArray(data) ? data : []));
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    // EKLEME
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(newGroup)
        });
        if (res.ok) {
            setNewGroup({ name: '', description: '' });
            setIsAddModalOpen(false);
            fetchGroups();
        }
    };

    // SİLME
    const confirmDelete = async () => {
        if (!deletingGroupId) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/groups/${deletingGroupId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            setGroups(prev => prev.filter(g => g.id !== deletingGroupId));
            setDeletingGroupId(null);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Grup Yönetimi</h3>
                <div className="card-actions">
                    <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>Yeni Grup Ekle</button>
                </div>
            </div>
            <div className="table-responsive">
                <table className="table card-table table-vcenter">
                    <thead><tr><th>ID</th><th>Grup Adı</th><th>Açıklama</th><th>Üye Sayısı</th><th>İşlemler</th></tr></thead>
                    <tbody>
                        {groups.map(g => (
                            <tr key={g.id}>
                                <td>{g.id}</td>
                                <td>{g.name}</td>
                                <td>{g.description}</td>
                                <td>{g._count?.users || 0}</td>
                                <td>
                                    <button className="btn btn-sm btn-ghost-danger" onClick={() => setDeletingGroupId(g.id)}>Sil</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ADD MODAL */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Grup Ekle">
                <form onSubmit={handleAdd}>
                    <div className="mb-3">
                        <label className="form-label">Grup Adı</label>
                        <input type="text" className="form-control" value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Açıklama</label>
                        <textarea className="form-control" rows={3} value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}></textarea>
                    </div>
                    <div className="d-flex justify-content-end">
                        <button type="submit" className="btn btn-primary">Kaydet</button>
                    </div>
                </form>
            </Modal>

            {/* DELETE MODAL */}
            <Modal isOpen={!!deletingGroupId} onClose={() => setDeletingGroupId(null)} title="Grup Sil?" size="sm" footer={
                <>
                    <button className="btn btn-link link-secondary me-auto" onClick={() => setDeletingGroupId(null)}>İptal</button>
                    <button className="btn btn-danger" onClick={confirmDelete}>Sil</button>
                </>
            }>
                <p>Bu grubu silmek istediğinden emin misin?</p>
            </Modal>
        </div>
    );
}
