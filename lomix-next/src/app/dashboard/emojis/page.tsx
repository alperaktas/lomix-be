"use client";

import { useEffect, useState, useRef } from 'react';
import {
    DndContext, closestCenter, PointerSensor, TouchSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripHorizontal, Loader2, Play, Plus, Pencil, Trash2, Upload, X, Smile,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface EmojiItem {
    id: number; name: string; imageUrl: string; svgaUrl: string | null; order: number; isVisible: boolean;
}

function SortableEmojiItem({ e, onEdit, onDelete }: { e: EmojiItem; onEdit: () => void; onDelete: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: e.id });
    const animExt = e.svgaUrl?.split('.').pop()?.toUpperCase();
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn('relative rounded-xl border bg-muted/30 p-2.5 flex flex-col items-center gap-1.5', isDragging && 'opacity-40 shadow-xl z-50')}
        >
            <div
                {...attributes} {...listeners}
                className="absolute top-0.5 left-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none"
            >
                <GripHorizontal className="h-3 w-3" />
            </div>
            <div className="relative w-12 h-12 mt-1">
                <img src={e.imageUrl} alt={e.name} className="w-full h-full object-contain rounded-lg" />
                {!e.isVisible && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <span className="text-white text-[9px] font-medium">Gizli</span>
                    </div>
                )}
            </div>
            <p className="text-[11px] font-medium text-center leading-tight w-full truncate">{e.name}</p>
            {e.svgaUrl && (
                <span className="text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1 rounded">{animExt}</span>
            )}
            <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                <button onClick={onEdit} className="h-5 w-5 flex items-center justify-center bg-background border rounded shadow text-muted-foreground hover:text-foreground">
                    <Pencil className="h-2.5 w-2.5" />
                </button>
                <button onClick={onDelete} className="h-5 w-5 flex items-center justify-center bg-background border rounded shadow text-muted-foreground hover:text-rose-500">
                    <Trash2 className="h-2.5 w-2.5" />
                </button>
            </div>
        </div>
    );
}

const emptyForm = { name: '', imageUrl: '', svgaUrl: '', order: 0, isVisible: true };

export default function EmojisPage() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { Authorization: `Bearer ${token}` };
    const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };

    const [loading, setLoading] = useState(true);
    const [emojis, setEmojis] = useState<EmojiItem[]>([]);
    const [animPreview, setAnimPreview] = useState<string | null>(null);

    const [dialog, setDialog] = useState(false);
    const [editTarget, setEditTarget] = useState<EmojiItem | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<EmojiItem | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [animUploading, setAnimUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const animInputRef = useRef<HTMLInputElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    );

    const fetchAll = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/emojis', { headers });
            const data = await res.json();
            setEmojis(data.emojis || []);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = emojis.findIndex(e => e.id === active.id);
        const newIndex = emojis.findIndex(e => e.id === over.id);
        const reordered = arrayMove(emojis, oldIndex, newIndex);
        setEmojis(reordered.map((e, i) => ({ ...e, order: i })));
        reordered.forEach((e, i) => {
            fetch(`/api/emojis/${e.id}`, {
                method: 'PUT', headers: jsonHeaders,
                body: JSON.stringify({ name: e.name, imageUrl: e.imageUrl, svgaUrl: e.svgaUrl, isVisible: e.isVisible, order: i }),
            });
        });
    };

    const openCreate = () => { setEditTarget(null); setForm(emptyForm); setDialog(true); };
    const openEdit = (e: EmojiItem) => {
        setEditTarget(e);
        setForm({ name: e.name, imageUrl: e.imageUrl, svgaUrl: e.svgaUrl || '', order: e.order, isVisible: e.isVisible });
        setDialog(true);
    };

    const uploadFile = async (file: File, type: 'image' | 'svga') => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', type);
        const res = await fetch('/api/emojis/upload', { method: 'POST', headers, body: fd });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        return data.url as string;
    };
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setImageUploading(true);
        try { const url = await uploadFile(file, 'image'); setForm(f => ({ ...f, imageUrl: url })); }
        finally { setImageUploading(false); if (imageInputRef.current) imageInputRef.current.value = ''; }
    };
    const handleAnimChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setAnimUploading(true);
        try { const url = await uploadFile(file, 'svga'); setForm(f => ({ ...f, svgaUrl: url })); }
        finally { setAnimUploading(false); if (animInputRef.current) animInputRef.current.value = ''; }
    };

    const save = async () => {
        if (!form.name.trim() || !form.imageUrl) return;
        setSaving(true);
        try {
            if (editTarget) {
                await fetch(`/api/emojis/${editTarget.id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(form) });
            } else {
                await fetch('/api/emojis', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(form) });
            }
            setDialog(false);
            fetchAll();
        } finally { setSaving(false); }
    };

    const deleteEmoji = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await fetch(`/api/emojis/${deleteTarget.id}`, { method: 'DELETE', headers });
            setDeleteTarget(null);
            fetchAll();
        } finally { setDeleteLoading(false); }
    };

    const animExt = form.svgaUrl ? form.svgaUrl.split('.').pop()?.toLowerCase() : null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Emojiler</h2>
                    <p className="text-muted-foreground">Hareketli emoji yönetimi.</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" /> Yeni Emoji
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : emojis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
                    <Smile className="h-12 w-12 opacity-20" />
                    <p>Henüz emoji eklenmemiş.</p>
                    <Button variant="outline" size="sm" onClick={openCreate}>
                        <Plus className="h-4 w-4 mr-2" /> İlk Emojiyi Ekle
                    </Button>
                </div>
            ) : (
                <div className="rounded-xl border bg-card p-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={emojis.map(e => e.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                                {emojis.map(e => (
                                    <SortableEmojiItem key={e.id} e={e} onEdit={() => openEdit(e)} onDelete={() => setDeleteTarget(e)} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            )}

            {/* ---- Create / Edit Dialog ---- */}
            <Dialog open={dialog} onOpenChange={setDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editTarget ? 'Emojiyi Düzenle' : 'Yeni Emoji'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>İsim *</Label>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Emoji adı" />
                        </div>
                        <div className="space-y-1">
                            <Label>Sıra</Label>
                            <Input type="number" value={form.order || ''} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
                        </div>
                        {/* Image */}
                        <div className="space-y-1">
                            <Label>İkon (PNG) *</Label>
                            <div className="flex items-center gap-3">
                                {form.imageUrl && (
                                    <div className="relative w-14 h-14 flex-shrink-0">
                                        <img src={form.imageUrl} alt="" className="w-full h-full object-contain rounded-lg border" />
                                        <button onClick={() => setForm(f => ({ ...f, imageUrl: '' }))} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                                <Button type="button" variant="outline" size="sm" disabled={imageUploading} onClick={() => imageInputRef.current?.click()}>
                                    {imageUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                    {form.imageUrl ? 'Değiştir' : 'Yükle'}
                                </Button>
                                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </div>
                        </div>
                        {/* Animation */}
                        <div className="space-y-1">
                            <Label>Animasyon (SVGA / MP4 / GIF)</Label>
                            <div className="flex items-center gap-3 flex-wrap">
                                {form.svgaUrl && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2 py-1.5 rounded border">
                                        <span className="text-emerald-600 font-medium uppercase">✓ {animExt} yüklendi</span>
                                        <button onClick={() => setForm(f => ({ ...f, svgaUrl: '' }))}><X className="h-3 w-3" /></button>
                                    </div>
                                )}
                                {form.svgaUrl && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => setAnimPreview(form.svgaUrl)}>
                                        <Play className="h-4 w-4 mr-1" /> Oynat
                                    </Button>
                                )}
                                <Button type="button" variant="outline" size="sm" disabled={animUploading} onClick={() => animInputRef.current?.click()}>
                                    {animUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                    {form.svgaUrl ? 'Değiştir' : 'Yükle'}
                                </Button>
                                <input ref={animInputRef} type="file" accept=".svga,.mp4,.gif" className="hidden" onChange={handleAnimChange} />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="emojiVisible" checked={form.isVisible} onChange={e => setForm(f => ({ ...f, isVisible: e.target.checked }))} className="h-4 w-4 rounded border-border cursor-pointer" />
                            <Label htmlFor="emojiVisible">Görünür (mobile'da göster)</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(false)}>İptal</Button>
                        <Button onClick={save} disabled={saving || !form.name.trim() || !form.imageUrl}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editTarget ? 'Kaydet' : 'Ekle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---- Delete Dialog ---- */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Emojiyi Sil</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{deleteTarget?.name}</span> emojisini silmek istiyor musunuz?
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={deleteEmoji} disabled={deleteLoading}>
                            {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---- Animation preview ---- */}
            <Dialog open={!!animPreview} onOpenChange={() => setAnimPreview(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Animasyon Önizleme</DialogTitle>
                    </DialogHeader>
                    {animPreview && (/\.mp4$/i.test(animPreview) ? (
                        <video autoPlay muted src={animPreview} onEnded={() => setAnimPreview(null)} className="w-full rounded-xl" />
                    ) : /\.gif$/i.test(animPreview) ? (
                        <img src={animPreview} className="w-full rounded-xl" alt="animation" />
                    ) : (
                        <SVGAPreview url={animPreview} onEnd={() => setAnimPreview(null)} />
                    ))}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SVGAPreview({ url, onEnd }: { url: string; onEnd: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!canvasRef.current) return;
        let player: any;
        (async () => {
            try {
                const mod = await import('svgaplayerweb');
                const Lib = (mod as any).default ?? mod;
                player = new Lib.Player(canvasRef.current!);
                player.loops = 1;
                player.clearsAfterStop = false;
                player.onFinished(onEnd);
                const parser = new Lib.Parser();
                parser.load(url, (item: any) => {
                    if (canvasRef.current && item.videoSize) {
                        canvasRef.current.width = item.videoSize.width;
                        canvasRef.current.height = item.videoSize.height;
                    }
                    player.setVideoItem(item);
                    player.startAnimation();
                }, (err: Error) => console.error('SVGA error', err));
            } catch (e) { console.error('SVGA init', e); }
        })();
        return () => { try { player?.stopAnimation(true); player?.clear(); } catch {} };
    }, [url]);
    return <canvas ref={canvasRef} className="w-full max-h-[50vh]" />;
}
