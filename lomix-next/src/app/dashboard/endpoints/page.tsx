"use client";

import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";

export default function EndpointsPage() {
    const [endpoints, setEndpoints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEndpoints = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/endpoints', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            setEndpoints(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Endpointler yüklenemedi", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEndpoints();
    }, []);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">API Endpointleri</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Sistemde kayıtlı toplam {endpoints.length} endpoint bulunmaktadır.
                    </p>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => fetchEndpoints()}
                    disabled={loading}
                >
                    <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Yenile
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
            ) : (
                <DataTable 
                    columns={columns} 
                    data={endpoints} 
                />
            )}
        </div>
    );
}
