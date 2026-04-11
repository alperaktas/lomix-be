"use client";

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Activity,
  LogIn,
  Trash2,
  AlertCircle
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
            const res = await fetch(`/api/logs?page=${pageNum}&search=${searchStr}`, {
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

    const getActionBadge = (action: string) => {
        if (action.includes('LOGIN')) return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><LogIn className="w-3 h-3 mr-1" /> {action}</Badge>;
        if (action.includes('DELETE')) return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20"><Trash2 className="w-3 h-3 mr-1" /> {action}</Badge>;
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Activity className="w-3 h-3 mr-1" /> {action}</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">Sistem Logları</h2>
                <p className="text-muted-foreground">
                    Tüm kullanıcı hareketlerini ve sistem olaylarını buradan takip edebilirsiniz.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Hareket Geçmişi</CardTitle>
                            <CardDescription>
                                Toplam {meta.total} kayıt bulundu.
                            </CardDescription>
                        </div>
                        <form onSubmit={handleSearch} className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="İşlem, kullanıcı veya IP..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </form>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[180px]">Tarih</TableHead>
                                    <TableHead>Kullanıcı</TableHead>
                                    <TableHead>İşlem</TableHead>
                                    <TableHead>IP Adresi</TableHead>
                                    <TableHead className="hidden lg:table-cell">Cihaz</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <span className="text-muted-foreground">Loglar yükleniyor...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <AlertCircle className="h-8 w-8" />
                                                <span>Hiç kayıt bulunamadı.</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : logs.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString('tr-TR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">{log.user?.username || 'Sistem'}</span>
                                                {log.user?.email && <span className="text-xs text-muted-foreground">{log.user.email}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getActionBadge(log.action)}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {log.ipAddress || '-'}
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[200px]" title={log.userAgent}>
                                            {log.userAgent || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t p-4">
                    <div className="text-sm text-muted-foreground">
                        Sayfa <span className="font-medium text-foreground">{page}</span> / <span className="font-medium text-foreground">{meta.total_pages}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Geri
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))}
                            disabled={page === meta.total_pages || loading}
                        >
                            İleri
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
