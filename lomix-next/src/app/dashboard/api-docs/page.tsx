'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCode } from "lucide-react";

// SwaggerUI must be rendered on the client
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/20">
            <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-muted-foreground">API dökümantasyonu yükleniyor...</p>
            </div>
        </div>
    )
});

export default function ApiDocsPage() {
    const [spec, setSpec] = useState(null);
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const uiRef = useRef<any>(null);

    useEffect(() => {
        if (token && uiRef.current) {
            uiRef.current.preauthorizeApiKey("bearerAuth", token);
            console.log("Token applied to SwaggerUI instance");
        }
    }, [token]);

    useEffect(() => {
        // First fetch the token
        fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: '123' })
        })
        .then(res => res.json())
        .then(data => {
            if (data.token) {
                setToken(data.token);
                console.log("Admin token automatically fetched for Swagger");
            }
        })
        .catch(err => console.error("Admin auto-login failed:", err));

        // Then fetch the spec
        fetch('/swagger.json')
            .then((res) => {
                if (!res.ok) throw new Error('Swagger dosyası bulunamadı. Lütfen /public/swagger.json dosyasını kontrol edin.');
                return res.json();
            })
            .then((data) => setSpec(data))
            .catch((err) => {
                console.error('Swagger spec yüklenemedi:', err);
                setError(err.message);
            });
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">API Dökümantasyonu</h2>
                    <p className="text-muted-foreground">Mobil uygulama ve backend servisleri için interaktif Swagger arayüzü.</p>
                </div>
            </div>

            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/10 pb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FileCode className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">Mobil API Swagger Spesifikasyonu</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0 min-h-[70vh]">
                    {error ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
                                <FileCode className="h-6 w-6" />
                            </div>
                            <p className="text-lg font-semibold text-destructive">{error}</p>
                            <p className="text-muted-foreground mt-1">Sistem yöneticinizle iletişime geçin.</p>
                        </div>
                    ) : spec ? (
                        <div className="swagger-custom-wrapper">
                            <SwaggerUI 
                                spec={spec} 
                                onComplete={(ui: any) => {
                                    uiRef.current = ui;
                                    if (token) {
                                        ui.preauthorizeApiKey("bearerAuth", token);
                                    }
                                }}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-24 text-muted-foreground">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                            <p>Ayrıntılar getiriliyor...</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <style jsx global>{`
                .swagger-custom-wrapper .swagger-ui {
                    padding-bottom: 2rem;
                }
                .swagger-custom-wrapper .swagger-ui .info {
                    margin: 20px 0;
                    padding: 0 20px;
                }
                .swagger-custom-wrapper .swagger-ui .scheme-container {
                    background: transparent;
                    box-shadow: none;
                    padding: 10px 20px;
                    border-bottom: 1px solid var(--border);
                }
                .swagger-custom-wrapper .swagger-ui select {
                    background-color: var(--background);
                    color: var(--foreground);
                    border: 1px solid var(--border);
                    border-radius: 4px;
                    padding: 4px;
                }
                .swagger-custom-wrapper .swagger-ui .opblock {
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    border: 1px solid var(--border);
                }
                .swagger-custom-wrapper .swagger-ui .opblock-tag {
                    border-bottom: 1px solid var(--border);
                    margin-bottom: 10px;
                    padding: 10px 20px;
                }
            `}</style>
        </div>
    );
}
