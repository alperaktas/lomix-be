'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// SwaggerUI must be rendered on the client
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
    ssr: false,
    loading: () => <div className="p-5 text-center">API dökümantasyonu yükleniyor...</div>
});

export default function ApiDocsPage() {
    const [spec, setSpec] = useState(null);

    useEffect(() => {
        fetch('/api/docs')
            .then((res) => res.json())
            .then((data) => setSpec(data))
            .catch((err) => console.error('Swagger spec yüklenemedi:', err));
    }, []);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Mobil API Swagger Dökümantasyonu</h3>
            </div>
            <div className="card-body p-0" style={{ minHeight: '80vh' }}>
                {spec ? (
                    <SwaggerUI spec={spec} />
                ) : (
                    <div className="p-5 text-center text-muted">Ayrıntılar getiriliyor...</div>
                )}
            </div>
        </div>
    );
}
