"use client";

import React, { useEffect, useState } from 'react';

export default function EndpointsPage() {
    const [endpoints, setEndpoints] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/endpoints', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        })
            .then(res => res.json())
            .then(data => setEndpoints(Array.isArray(data) ? data : []));
    }, []);

    return (
        <div className="card">
            <div className="card-header"><h3 className="card-title">API Endpointleri</h3></div>
            <div className="table-responsive">
                <table className="table card-table table-vcenter">
                    <thead><tr><th>Method</th><th>Path</th><th>Kategori</th><th>Açıklama</th></tr></thead>
                    <tbody>
                        {endpoints.map(e => (
                            <tr key={e.id}>
                                <td><span className="badge bg-blue-lt">{e.method}</span></td>
                                <td>{e.path}</td>
                                <td>{e.category}</td>
                                <td>{e.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
