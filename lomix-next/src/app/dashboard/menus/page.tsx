"use client";

import React, { useEffect, useState } from 'react';

interface Menu {
    id: number;
    title: string;
    url: string;
    parentId: number | null;
    order: number;
    children?: Menu[];
}

export default function MenusPage() {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMenus = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/menus', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const data = await res.json();

                // Ağaç yapısı oluştur
                const map: any = {};
                const tree: Menu[] = [];
                // Data kopyası üzerinden gidelim
                const items = JSON.parse(JSON.stringify(data));

                items.forEach((m: any) => map[m.id] = { ...m, children: [] });
                items.forEach((m: any) => {
                    if (m.parentId && map[m.parentId]) {
                        map[m.parentId].children.push(map[m.id]);
                    } else {
                        // Sadece parentId'si olmayanları (root) ana diziye ekle
                        if (!m.parentId) tree.push(map[m.id]);
                    }
                });
                setMenus(tree);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenus();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('Bu menüyü silmek istediğinize emin misiniz?')) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/menus/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (res.ok) {
                fetchMenus(); // Listeyi yenile
            } else {
                alert('Silme işlemi başarısız');
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div>Yükleniyor...</div>;

    // Recursive menü render fonksiyonu
    const renderMenuRows = (items: Menu[], level = 0): React.ReactNode => {
        return items.map(item => (
            <React.Fragment key={item.id}>
                <tr>
                    <td><span style={{ marginLeft: level * 20 + 'px' }}>{level > 0 ? '↳ ' : ''}{item.title}</span></td>
                    <td>{item.url}</td>
                    <td>{item.order}</td>
                    <td>
                        <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDelete(item.id)}>Sil</button>
                    </td>
                </tr>
                {item.children && item.children.length > 0 && renderMenuRows(item.children, level + 1)}
            </React.Fragment>
        ));
    };

    return (
        <div className="row">
            <div className="col-12">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Mevcut Menüler</h3>
                    </div>
                    <div className="table-responsive">
                        <table className="table card-table table-vcenter text-nowrap">
                            <thead>
                                <tr>
                                    <th>Başlık</th>
                                    <th>URL</th>
                                    <th>Sıra</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderMenuRows(menus)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
