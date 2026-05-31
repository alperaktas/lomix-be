"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Topic {
    id: number;
    title: string;
    imageUrl: string | null;
    isActive: boolean;
    createdAt: string;
}

const emptyForm = { title: '', imageUrl: '', isActive: true };

export default function HotTopicsPage() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Topic | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    const fetchTopics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/anlar/topics', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setTopics(data.topics || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTopics(); }, []);

    const openCreate = () => {
        setEditTarget(null);
        setForm(emptyForm);
        setDialogOpen(true);
    };

    const openEdit = (topic: Topic) => {
        setEditTarget(topic);
        setForm({ title: topic.title, imageUrl: topic.imageUrl || '', isActive: topic.isActive });
        setDialogOpen(true);
    };

    const save = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        try {
            if (editTarget) {
                await fetch(`/api/anlar/topics/${editTarget.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(form),
                });
            } else {
                await fetch('/api/anlar/topics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(form),
                });
            }
            setDialogOpen(false);
            fetchTopics();
        } finally {
            setSaving(false);
        }
    };

    const deleteTopic = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await fetch(`/api/anlar/topics/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setDeleteTarget(null);
            fetchTopics();
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Sıcak Konular</h2>
                    <p className="text-muted-foreground">Anlar bölümünde gösterilecek hot topic'leri yönet.</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" /> Yeni Konu
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : topics.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">Henüz konu eklenmemiş.</div>
            ) : (
                <div className="space-y-2">
                    {topics.map(topic => (
                        <div key={topic.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card/50">
                            {topic.imageUrl && (
                                <img src={topic.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium">{topic.title}</p>
                                <p className="text-xs text-muted-foreground">ID: {topic.id}</p>
                            </div>
                            <Badge variant={topic.isActive ? 'default' : 'secondary'}>
                                {topic.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                            <div className="flex gap-2 flex-shrink-0">
                                <Button size="sm" variant="outline" onClick={() => openEdit(topic)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(topic)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editTarget ? 'Konuyu Düzenle' : 'Yeni Konu Ekle'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>Başlık *</Label>
                            <Input
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Konu başlığı"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Görsel URL</Label>
                            <Input
                                value={form.imageUrl}
                                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={form.isActive}
                                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                                className="h-4 w-4 rounded border-border cursor-pointer"
                            />
                            <Label htmlFor="isActive">Aktif</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
                        <Button onClick={save} disabled={saving || !form.title.trim()}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editTarget ? 'Kaydet' : 'Ekle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konuyu Sil</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{deleteTarget?.title}</span> konusunu silmek istediğinizden emin misiniz?
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={deleteTopic} disabled={deleteLoading}>
                            {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
