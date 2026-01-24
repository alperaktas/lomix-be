"use client";

import React, { useEffect, useState } from 'react';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            setPhone(parsed.phone || '');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ phone })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('user', JSON.stringify(data.user)); // LocalStorage güncelle
                setUser(data.user);
                alert('Profil güncellendi');
            } else {
                alert('Hata oluştu');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div>Yükleniyor...</div>;

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Profilim</h3>
            </div>
            <div className="card-body">
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Kullanıcı Adı</label>
                        <input type="text" className="form-control" value={user.username} disabled />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-control" value={user.email} disabled />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Telefon</label>
                        <input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                    <div className="form-footer">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Güncelleniyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
