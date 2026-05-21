"use client";

import { useEffect, useState } from 'react';
import { Loader2, RefreshCcw, Trash2, MessageSquareX, Ban, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default function AnlarPage() {
    const [anlar, setAnlar] = useState<An[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<An | null>(null);
    const [banTarget, setBanTarget] = useState<An | null>(null);
    const [commentsAn, setCommentsAn] = useState<An | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    const fetchAnlar = async (p = page) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/anlar?page=${p}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setAnlar(data.anlar);
            setTotalPages(data.totalPages);
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async (an: An) => {
        setCommentsAn(an);
        setCommentsLoading(true);
        try {
            const res = await fetch('/api/mobile/anlar/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ an_id: an.id }),
            });
            const data = await res.json();
            setComments(data.data?.comments || []);
        } finally {
            setCommentsLoading(false);
        }
    };

    const deleteAn = async () => {
        if (!deleteTarget) return;
        setActionLoading(true);
        try {
            await fetch(`/api/anlar?id=${deleteTarget.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setDeleteTarget(null);
            fetchAnlar();
        } finally {
            setActionLoading(false);
        }
    };

    const deleteComment = async (commentId: number) => {
        await fetch(`/api/anlar/comment?id=${commentId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (commentsAn) fetchComments(commentsAn);
    };

    const toggleAnBan = async () => {
        if (!banTarget) return;
        setActionLoading(true);
        try {
            await fetch(`/api/users/${banTarget.user.id}/an-ban`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            setBanTarget(null);
            fetchAnlar();
        } finally {
            setActionLoading(false);
        }
    };

    useEffect(() => { fetchAnlar(page); }, [page]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Anlar Yönetimi</h2>
                    <p className="text-muted-foreground">Kullanıcı anlarını incele, sil veya yasak uygula.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchAnlar(page)}>
                    <RefreshCcw className="h-4 w-4 mr-2" /> Yenile
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-3">
                    {anlar.map(an => (
                        <div key={an.id} className="flex items-start gap-4 p-4 rounded-xl border bg-card/50">
                            {an.imageUrl && (
                                <img src={an.imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={an.user.avatar || ''} />
                                        <AvatarFallback>{an.user.username[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-sm">{an.user.fullName || an.user.username}</span>
                                    {an.user.anBanned && <Badge variant="destructive" className="text-xs">An Yasaklı</Badge>}
                                    <Badge variant="outline" className="text-xs">{an.actionType}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{an.description}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {an.tags.map(t => (
                                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                                    ))}
                                </div>
                                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                    <span>❤️ {an.likeCount}</span>
                                    <span>👋 {an.hiLikeCount}</span>
                                    <span>💬 {an.commentCount}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                                <Button size="sm" variant="outline" onClick={() => fetchComments(an)}>
                                    <MessageSquareX className="h-4 w-4 mr-1" /> Yorumlar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setBanTarget(an)}>
                                    <Ban className="h-4 w-4 mr-1" />
                                    {an.user.anBanned ? 'Yasağı Kaldır' : 'Post Yasağı'}
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(an)}>
                                    <Trash2 className="h-4 w-4 mr-1" /> Sil
                                </Button>
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    <div className="flex items-center justify-center gap-4 pt-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* An Sil Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Anı Sil</DialogTitle>
                        <DialogDescription>
                            Bu anı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={deleteAn} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* An Ban Dialog */}
            <Dialog open={!!banTarget} onOpenChange={() => setBanTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {banTarget?.user.anBanned ? 'An Yasağını Kaldır' : 'Post Yasağı Uygula'}
                        </DialogTitle>
                        <DialogDescription>
                            {banTarget?.user.anBanned
                                ? `${banTarget.user.fullName || banTarget.user.username} kullanıcısının an paylaşma yasağı kaldırılacak.`
                                : `${banTarget?.user.fullName || banTarget?.user.username} kullanıcısı artık an paylaşamayacak.`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBanTarget(null)}>İptal</Button>
                        <Button variant={banTarget?.user.anBanned ? 'default' : 'destructive'} onClick={toggleAnBan} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {banTarget?.user.anBanned ? 'Yasağı Kaldır' : 'Yasak Uygula'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Yorumlar Dialog */}
            <Dialog open={!!commentsAn} onOpenChange={() => { setCommentsAn(null); setComments([]); }}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Yorumlar</DialogTitle>
                        <DialogDescription>{commentsAn?.description?.slice(0, 60)}</DialogDescription>
                    </DialogHeader>
                    {commentsLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : comments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Yorum yok.</p>
                    ) : (
                        <div className="space-y-3">
                            {comments.map(c => (
                                <div key={c.id} className="space-y-2">
                                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                                        <Avatar className="h-7 w-7 flex-shrink-0">
                                            <AvatarImage src={c.user.avatar || ''} />
                                            <AvatarFallback>{c.user.username?.[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium">{c.user.fullName || c.user.username}</p>
                                            <p className="text-sm">{c.text}</p>
                                        </div>
                                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive flex-shrink-0"
                                            onClick={() => deleteComment(c.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {c.replies.map(r => (
                                        <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/10 ml-8">
                                            <Avatar className="h-6 w-6 flex-shrink-0">
                                                <AvatarImage src={r.user.avatar || ''} />
                                                <AvatarFallback>{r.user.username?.[0]?.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium">{r.user.fullName || r.user.username}</p>
                                                <p className="text-sm">{r.text}</p>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive flex-shrink-0"
                                                onClick={() => deleteComment(r.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
