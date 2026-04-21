"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCcw, ArrowLeft, Plus, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

type WordFilter = { id: number; word: string; createdAt: string };

export default function WordFiltersPage() {
    const [filters, setFilters] = useState<WordFilter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newWords, setNewWords] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const router = useRouter();

    const fetchFilters = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/rooms/word-filters', { headers: { Authorization: 'Bearer ' + token } });
            if (res.ok) setFilters(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFilters(); }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const words = newWords.split(/[\n,，]/).map(w => w.trim()).filter(Boolean);
        if (!words.length) return;
        const token = localStorage.getItem('token');
        const res = await fetch('/api/rooms/word-filters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ words }),
        });
        if (res.ok) { setNewWords(''); setIsAddOpen(false); fetchFilters(); }
        else alert('Eklenemedi');
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/rooms/word-filters/${deletingId}`, {
            method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) { setFilters(p => p.filter(f => f.id !== deletingId)); setDeletingId(null); }
        else alert('Silinemedi');
    };

    const filtered = filters.filter(f => f.word.includes(searchTerm.toLowerCase()));

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => router.push('/dashboard/rooms')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Kelime Filtresi</h1>
                    <p className="text-sm text-zinc-500 mt-1">{filters.length} engellenen kelime</p>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Ara..."
                        className="h-9 text-sm w-48"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Button variant="outline" size="sm" className="h-9 px-3" onClick={fetchFilters} disabled={loading}>
                        <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    <Button size="sm" className="h-9 gap-1.5 px-4 bg-zinc-900 text-white hover:bg-zinc-800 font-semibold"
                        onClick={() => setIsAddOpen(true)}>
                        <Plus className="h-4 w-4" /> Kelime Ekle
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-zinc-400">
                    <Filter className="h-8 w-8" />
                    <p className="text-sm">{searchTerm ? 'Eşleşme bulunamadı.' : 'Henüz filtre eklenmemiş.'}</p>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {filtered.map(f => (
                        <div key={f.id} className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-700 group">
                            <span>{f.word}</span>
                            <button className="h-4 w-4 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-500 transition-colors"
                                onClick={() => setDeletingId(f.id)}>
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Kelime Ekle</DialogTitle>
                        <DialogDescription>Virgül veya yeni satır ile birden fazla kelime ekleyebilirsiniz.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAdd} className="flex flex-col gap-4 pt-2">
                        <textarea
                            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 min-h-[100px]"
                            placeholder={"küfür, hakaret\nyasaklı kelime"}
                            value={newWords}
                            onChange={e => setNewWords(e.target.value)}
                            required
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>İptal</Button>
                            <Button type="submit" size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 font-semibold">Ekle</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <div className="flex flex-col items-center text-center gap-4 py-2">
                        <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                            <Trash2 className="h-7 w-7 text-rose-600" />
                        </div>
                        <DialogHeader className="items-center">
                            <DialogTitle>Emin misiniz?</DialogTitle>
                            <DialogDescription>Bu kelime filtreden kaldırılacak.</DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 w-full pt-2 border-t border-zinc-100">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeletingId(null)}>İptal</Button>
                            <Button variant="destructive" size="sm" className="flex-1 font-semibold" onClick={confirmDelete}>Evet, Sil</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
