"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Trash2, Pencil, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface An {
    id: number;
    description: string | null;
    imageUrl: string | null;
    actionType: string;
    createdAt: string;
    tags: string[];
    likeCount: number;
    hiLikeCount: number;
    commentCount: number;
    user: { id: number; username: string; fullName: string | null; avatar: string | null; anBanned: boolean };
}

interface Comment {
    id: number;
    text: string;
    createdAt: string;
    user: { id: number; username: string; fullName: string | null; avatar: string | null };
    replies: Comment[];
}

export default function AnDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [an, setAn] = useState<An | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentsLoading, setCommentsLoading] = useState(false);

    const [deleteDialog, setDeleteDialog] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [editDialog, setEditDialog] = useState(false);
    const [editForm, setEditForm] = useState({ description: '', imageUrl: '', tags: '' });
    const [editTempImageUrl, setEditTempImageUrl] = useState('');
    const [editImageUploading, setEditImageUploading] = useState(false);
    const [editLoading, setEditLoading] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    const fetchAn = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/anlar?page=1`, { headers: { Authorization: `Bearer ${token}` } });
            // API döndüğünde id'ye göre filtrele — veya direkt an endpoint'i olmadığından listeyi kullan
        } finally {
            setLoading(false);
        }
    };

    const fetchAnDirect = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/anlar/detail?id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setAn(data.an);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        setCommentsLoading(true);
        try {
            const res = await fetch('/api/mobile/anlar/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ an_id: Number(id) }),
            });
            const data = await res.json();
            setComments(data.data?.comments || []);
        } finally {
            setCommentsLoading(false);
        }
    };

    const deleteAn = async () => {
        setDeleteLoading(true);
        try {
            await fetch(`/api/anlar?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            router.push('/dashboard/anlar');
        } finally {
            setDeleteLoading(false); setDeleteDialog(false);
        }
    };

    const cancelEdit = async () => {
        if (editTempImageUrl) {
            await fetch('/api/admin/upload', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ url: editTempImageUrl }),
            });
        }
        setEditDialog(false);
        setEditTempImageUrl('');
    };

    const uploadEditImage = async (file: File) => {
        setEditImageUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });
            const data = await res.json();
            if (data.url) {
                if (editTempImageUrl) {
                    await fetch('/api/admin/upload', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ url: editTempImageUrl }),
                    });
                }
                setEditTempImageUrl(data.url);
                setEditForm(f => ({ ...f, imageUrl: data.url }));
            }
        } finally {
            setEditImageUploading(false);
        }
    };

    const saveEdit = async () => {
        setEditLoading(true);
        try {
            const tags = editForm.tags.split(',').map(t => t.trim()).filter(Boolean);
            const res = await fetch('/api/anlar', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: Number(id), description: editForm.description, imageUrl: editForm.imageUrl, tags }),
            });
            if (res.ok) {
                setEditDialog(false);
                setEditTempImageUrl('');
                fetchAnDirect();
            }
        } finally {
            setEditLoading(false);
        }
    };

    const deleteComment = async (commentId: number) => {
        await fetch(`/api/anlar/comment?id=${commentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        fetchComments();
    };

    useEffect(() => {
        fetchAnDirect();
        fetchComments();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!an) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <p className="text-zinc-500">An bulunamadı.</p>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Geri Dön
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-3xl">
            <Button variant="ghost" size="sm" className="w-fit gap-2 text-zinc-500 hover:text-zinc-900" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" /> Geri
            </Button>

            {/* An Card */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={an.user.avatar || ''} />
                            <AvatarFallback>{an.user.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <button
                                onClick={() => router.push(`/dashboard/users/${an.user.id}`)}
                                className="font-semibold text-sm hover:underline cursor-pointer"
                            >
                                {an.user.fullName || an.user.username}
                            </button>
                            <p className="text-xs text-zinc-400">@{an.user.username} · {new Date(an.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => { setEditForm({ description: an.description || '', imageUrl: an.imageUrl || '', tags: an.tags.join(', ') }); setEditTempImageUrl(''); setEditDialog(true); }}>
                            <Pencil className="h-4 w-4 mr-1" /> Düzenle
                        </Button>
                        <Button variant="outline" size="sm" onClick={fetchAnDirect}>
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(true)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Sil
                        </Button>
                    </div>
                </div>

                {an.imageUrl && (
                    <img src={an.imageUrl} alt="" className="w-full max-h-96 rounded-lg object-cover" />
                )}

                {an.description && (
                    <p className="text-sm text-zinc-700">{an.description}</p>
                )}

                <div className="flex flex-wrap gap-1.5">
                    {an.tags.map(t => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                </div>

                <div className="flex gap-4 text-sm text-zinc-500 pt-2 border-t border-zinc-100">
                    <span>❤️ {an.likeCount} beğeni</span>
                    <span>👋 {an.hiLikeCount} hi</span>
                    <span>💬 {an.commentCount} yorum</span>
                    <Badge variant="outline" className="text-xs">{an.actionType}</Badge>
                    {an.user.anBanned && <Badge variant="destructive" className="text-xs">An Yasaklı</Badge>}
                </div>
            </div>

            {/* Comments */}
            <div className="space-y-3">
                <h3 className="font-semibold text-sm text-zinc-700">
                    Yorumlar {commentsLoading && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                </h3>
                {comments.length === 0 && !commentsLoading ? (
                    <p className="text-sm text-zinc-400">Yorum yok.</p>
                ) : (
                    <div className="space-y-2">
                        {comments.map(c => (
                            <div key={c.id} className="space-y-2">
                                <div className="flex items-start gap-3 p-3 rounded-lg border bg-white">
                                    <Avatar className="h-7 w-7 flex-shrink-0">
                                        <AvatarImage src={c.user.avatar || ''} />
                                        <AvatarFallback>{c.user.username?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-zinc-700">{c.user.fullName || c.user.username}</p>
                                        <p className="text-sm text-zinc-600 mt-0.5">{c.text}</p>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">{new Date(c.createdAt).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0 h-7 w-7 p-0" onClick={() => deleteComment(c.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                {c.replies.map(r => (
                                    <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border bg-zinc-50/50 ml-8">
                                        <Avatar className="h-6 w-6 flex-shrink-0">
                                            <AvatarImage src={r.user.avatar || ''} />
                                            <AvatarFallback>{r.user.username?.[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-zinc-700">{r.user.fullName || r.user.username}</p>
                                            <p className="text-sm text-zinc-600 mt-0.5">{r.text}</p>
                                        </div>
                                        <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0 h-7 w-7 p-0" onClick={() => deleteComment(r.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Dialog */}
            <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Anı Sil</DialogTitle>
                        <DialogDescription>Bu anı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialog(false)}>İptal</Button>
                        <Button variant="destructive" onClick={deleteAn} disabled={deleteLoading}>
                            {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialog} onOpenChange={open => { if (!open) cancelEdit(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Anı Düzenle</DialogTitle>
                        <DialogDescription>Açıklama, resim ve etiketleri güncelleyebilirsiniz.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Açıklama</label>
                            <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Açıklama..." />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Resim</label>
                            {editForm.imageUrl && (
                                <img src={editForm.imageUrl} alt="" className="w-full h-40 object-cover rounded-lg" />
                            )}
                            <label className="cursor-pointer">
                                <div className="flex h-9 w-full items-center rounded-md border border-input bg-white px-3 text-sm text-muted-foreground hover:bg-accent cursor-pointer">
                                    {editImageUploading ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Yükleniyor...</> : 'Fotoğraf seç...'}
                                </div>
                                <input type="file" accept="image/*" className="hidden" disabled={editImageUploading} onChange={e => { const f = e.target.files?.[0]; if (f) uploadEditImage(f); }} />
                            </label>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Etiketler (virgülle ayırın)</label>
                            <Input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} placeholder="Spor, Yemek, Müzik" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={cancelEdit}>İptal</Button>
                        <Button onClick={saveEdit} disabled={editLoading || editImageUploading}>
                            {editLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
