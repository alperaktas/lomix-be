"use client";

import React, { useEffect, useState } from 'react';

export default function LogsPage() {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/logs', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        })
            .then(res => res.json())
            .then(data => setLogs(Array.isArray(data) ? data : []));
    }, []);

    return (
        <div className="card">
            <div className="card-header"><h3 className="card-title">Sistem Logları (Son 100)</h3></div>
            <div className="table-responsive">
                <table className="table card-table table-vcenter">
                    <thead><tr><th>Tarih</th><th>Kullanıcı</th><th>İşlem</th><th>IP</th></tr></thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td>{new Date(log.createdAt).toLocaleString('tr-TR')}</td>
                                <td>{log.user?.username || log.userId}</td>
                                <td><span className={log.action === 'LOGIN' ? 'text-green' : ''}>{log.action}</span></td>
                                <td>{log.ipAddress}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
