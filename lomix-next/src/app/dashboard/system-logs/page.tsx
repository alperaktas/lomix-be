"use client";

import React, { useEffect, useState } from 'react';
import {
    Loader2,
    RefreshCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";

export default function LogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<any>({ total_pages: 1, total: 0 });

    const fetchLogs = async (pageNum: number, searchStr: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/logs?page=${pageNum}&search=${searchStr}&limit=10`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const result = await res.json();
            if (result.success) {
                setLogs(result.data);
                setMeta(result.meta);
            }
        } catch (err) {
            console.error("Loglar yüklenemedi", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page, search);
    }, [page]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs(1, search);
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Sistem Logları</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Toplam {meta.total} kayıt
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <form onSubmit={handleSearch}>
                        <Input
                            type="search"
                            placeholder="Ara..."
                            className="h-9 w-64 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={() => fetchLogs(page, search)}
                        disabled={loading}
                    >
                        <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Yenile
                    </Button>
                </div>
            </div>

            {/* Table */}
            {loading && logs.length === 0 ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
            ) : (
                <DataTable 
                    columns={columns} 
                    data={logs} 
                    pageCount={meta.total_pages}
                    pageIndex={page}
                    onPageChange={(newPage) => setPage(newPage)}
                />
            )}
        </div>
    );
}
