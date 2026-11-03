'use client';

import React, { useEffect, useState } from 'react';
import 'swagger-ui-react/swagger-ui.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCode } from "lucide-react";

// swagger-ui-react arayüzü bizim React kopyamızla çalıştırıyor ve eski yaşam döngüsü yöntemleri yüzünden
// (ParameterRow: UNSAFE_componentWillReceiveProps) strict modda uyarı veriyor. Kendi React'ini taşıyan
// bağımsız paket /api/docs sayfasındaki gibi yüklenir; sürüm swagger-ui-react ile aynı.
const SWAGGER_BUNDLE_URL = 'https://unpkg.com/swagger-ui-dist@5.31.0/swagger-ui-bundle.js';

function loadSwaggerBundle(): Promise<void> {
    const w = window as any;
    if (w.SwaggerUIBundle) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${SWAGGER_BUNDLE_URL}"]`);
        const script = existing ?? document.createElement('script');
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject(new Error('Swagger arayüzü yüklenemedi. İnternet bağlantınızı kontrol edin.')));
        if (!existing) {
            script.src = SWAGGER_BUNDLE_URL;
            document.head.appendChild(script);
        }
    });
}

export default function ApiDocsPage() {
    const [spec, setSpec] = useState<object | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
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

    useEffect(() => {
        if (!spec) return;
        let cancelled = false;
        loadSwaggerBundle()
            .then(() => {
                if (cancelled) return;
                const ui = (window as any).SwaggerUIBundle({ spec, dom_id: '#swagger-ui-root' });
                // "Try it out" istekleri giriş yapmış yöneticinin jetonuyla gider.
                const token = localStorage.getItem('token');
                if (token) ui.preauthorizeApiKey('bearerAuth', token);
            })
            .catch((err) => { if (!cancelled) setError(err.message); });
        return () => { cancelled = true; };
    }, [spec]);

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
                            <div id="swagger-ui-root" />
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
