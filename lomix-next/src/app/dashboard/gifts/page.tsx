"use client";

import { useEffect, useState, useRef } from 'react';
import {
    DndContext, closestCenter, PointerSensor, TouchSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext, useSortable, arrayMove,
    rectSortingStrategy, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripVertical, GripHorizontal, Loader2, Play, Plus,
    Pencil, Trash2, Upload, X, Gift, ChevronDown, PackageOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Category {
    id: number; name: string; order: number; isActive: boolean; _count: { gifts: number };
}
interface GiftItem {
    id: number; categoryId: number; name: string; imageUrl: string;
    svgaUrl: string | null; price: number; isVisible: boolean; order: number;
}

// ---- Sortable gift card ----
function SortableGiftItem({ g, onEdit, onDelete }: { g: GiftItem; onEdit: () => void; onDelete: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: g.id });
    const animExt = g.svgaUrl?.split('.').pop()?.toUpperCase();
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
                <img src={g.imageUrl} alt={g.name} className="w-full h-full object-contain rounded-lg" />
                {!g.isVisible && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <span className="text-white text-[9px] font-medium">Gizli</span>
                    </div>
                )}
            </div>
            <p className="text-[11px] font-medium text-center leading-tight w-full truncate">{g.name}</p>
            <div className="flex items-center gap-0.5">
                <Gift className="h-2.5 w-2.5 text-amber-500" />
                <span className="text-[11px] text-amber-600 font-bold">{g.price}</span>
            </div>
            {g.svgaUrl && (
                <span className="text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1 rounded">{animExt}</span>
            )}
            <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                <button
                    onClick={onEdit}
                    className="h-5 w-5 flex items-center justify-center bg-background border rounded shadow text-muted-foreground hover:text-foreground"
                >
                    <Pencil className="h-2.5 w-2.5" />
                </button>
                <button
                    onClick={onDelete}
                    className="h-5 w-5 flex items-center justify-center bg-background border rounded shadow text-muted-foreground hover:text-rose-500"
                >
                    <Trash2 className="h-2.5 w-2.5" />
                </button>
            </div>
        </div>
    );
}

// ---- Sortable category row ----
interface SortableCatProps {
    cat: Category; catGifts: GiftItem[]; isOpen: boolean;
    onToggle: () => void; onEdit: () => void; onDelete: () => void;
    onAddGift: () => void; onEditGift: (g: GiftItem) => void; onDeleteGift: (g: GiftItem) => void;
    sensors: ReturnType<typeof useSensors>; onGiftDragEnd: (e: DragEndEvent) => void;
}
function SortableCategoryItem({ cat, catGifts, isOpen, onToggle, onEdit, onDelete, onAddGift, onEditGift, onDeleteGift, sensors, onGiftDragEnd }: SortableCatProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn('rounded-xl border bg-card overflow-hidden', isDragging && 'opacity-40 shadow-2xl')}
        >
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/40 transition-colors"
                onClick={onToggle}
            >
                <button
                    {...attributes} {...listeners}
                    className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
                    onClick={e => e.stopPropagation()}
                >
                    <GripVertical className="h-4 w-4" />
                </button>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0', isOpen && 'rotate-180')} />
                <span className="font-semibold flex-1">{cat.name}</span>
                <Badge variant="outline" className="text-xs">{catGifts.length} hediye</Badge>
                <Badge variant={cat.isActive ? 'default' : 'secondary'} className="text-xs">{cat.isActive ? 'Aktif' : 'Pasif'}</Badge>
                <div className="flex gap-1.5 ml-1" onClick={e => e.stopPropagation()}>
                    <button onClick={onEdit} className="h-7 w-7 flex items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground transition-colors" title="Düzenle">
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={onDelete} className="h-7 w-7 flex items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-rose-500 transition-colors" title="Sil">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="border-t px-4 py-4 space-y-4">
                    {catGifts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                            <PackageOpen className="h-8 w-8 opacity-20" />
                            <p className="text-sm">Bu kategoride henüz hediye yok.</p>
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onGiftDragEnd}>
                            <SortableContext items={catGifts.map(g => g.id)} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                                    {catGifts.map(g => (
                                        <SortableGiftItem key={g.id} g={g} onEdit={() => onEditGift(g)} onDelete={() => onDeleteGift(g)} />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                    <Button size="sm" variant="outline" className="w-full border-dashed" onClick={onAddGift}>
                        <Plus className="h-4 w-4 mr-2" /> Bu Kategoriye Hediye Ekle
                    </Button>
                </div>
            )}
        </div>
    );
}

// ---- SVGA Canvas Player ----
function SVGACanvas({ url, onEnd }: { url: string; onEnd: () => void }) {
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
                parser.load(
                    url,
                    (item: any) => {
                        if (canvasRef.current && item.videoSize) {
                            canvasRef.current.width = item.videoSize.width;
                            canvasRef.current.height = item.videoSize.height;
                        }
                        player.setVideoItem(item);
                        player.startAnimation();
                    },
                    (err: Error) => console.error('SVGA load error', err),
                );
            } catch (e) {
                console.error('SVGA init error', e);
            }
        })();
        return () => { try { player?.stopAnimation(true); player?.clear(); } catch {} };
    }, [url]);

    return <canvas ref={canvasRef} className="w-full max-h-[50vh]" />;
}

// ---- Helpers ----
const emptyCatForm = { name: '', order: 0, isActive: true };
const emptyGiftForm = { categoryId: 0, name: '', imageUrl: '', svgaUrl: '', price: 0, isVisible: true, order: 0 };

// ---- Page ----
export default function GiftsPage() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { Authorization: `Bearer ${token}` };
    const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };

    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [gifts, setGifts] = useState<GiftItem[]>([]);
    const [openCats, setOpenCats] = useState<Set<number>>(new Set());
    const [animPreview, setAnimPreview] = useState<string | null>(null);

    // Category dialog
    const [catDialog, setCatDialog] = useState(false);
    const [catEdit, setCatEdit] = useState<Category | null>(null);
    const [catForm, setCatForm] = useState(emptyCatForm);
    const [catSaving, setCatSaving] = useState(false);
    const [catDeleteTarget, setCatDeleteTarget] = useState<Category | null>(null);
    const [catDeleteLoading, setCatDeleteLoading] = useState(false);

    // Gift dialog
    const [giftDialog, setGiftDialog] = useState(false);
    const [giftEdit, setGiftEdit] = useState<GiftItem | null>(null);
    const [giftForm, setGiftForm] = useState(emptyGiftForm);
    const [giftSaving, setGiftSaving] = useState(false);
    const [giftDeleteTarget, setGiftDeleteTarget] = useState<GiftItem | null>(null);
    const [giftDeleteLoading, setGiftDeleteLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [animUploading, setAnimUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const animInputRef = useRef<HTMLInputElement>(null);

    // DnD sensors — pointer (desktop) + touch (mobile)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    );

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [catRes, giftRes] = await Promise.all([
                fetch('/api/gift-categories', { headers }),
                fetch('/api/gifts', { headers }),
            ]);
            const catData = await catRes.json();
            const giftData = await giftRes.json();
            const cats: Category[] = catData.categories || [];
            setCategories(cats);
            setGifts(giftData.gifts || []);
            setOpenCats(new Set(cats.map(c => c.id)));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const toggleCat = (id: number) => {
        setOpenCats(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const giftsFor = (catId: number) => gifts.filter(g => g.categoryId === catId);

    // ---- DnD handlers ----
    const handleCatDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = categories.findIndex(c => c.id === active.id);
        const newIndex = categories.findIndex(c => c.id === over.id);
        const reordered = arrayMove(categories, oldIndex, newIndex);
        setCategories(reordered.map((c, i) => ({ ...c, order: i })));
        reordered.forEach((c, i) => {
            fetch(`/api/gift-categories/${c.id}`, {
                method: 'PUT', headers: jsonHeaders,
                body: JSON.stringify({ name: c.name, order: i, isActive: c.isActive }),
            });
        });
    };

    const handleGiftDragEnd = (catId: number) => (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const catGifts = gifts.filter(g => g.categoryId === catId);
        const oldIndex = catGifts.findIndex(g => g.id === active.id);
        const newIndex = catGifts.findIndex(g => g.id === over.id);
        const reordered = arrayMove(catGifts, oldIndex, newIndex);
        setGifts(prev => [
            ...prev.filter(g => g.categoryId !== catId),
            ...reordered.map((g, i) => ({ ...g, order: i })),
        ]);
        reordered.forEach((g, i) => {
            fetch(`/api/gifts/${g.id}`, {
                method: 'PUT', headers: jsonHeaders,
                body: JSON.stringify({
                    categoryId: g.categoryId, name: g.name, imageUrl: g.imageUrl,
                    svgaUrl: g.svgaUrl, price: g.price, isVisible: g.isVisible, order: i,
                }),
            });
        });
    };

    // ---- Category CRUD ----
    const openCatCreate = () => { setCatEdit(null); setCatForm(emptyCatForm); setCatDialog(true); };
    const openCatEdit = (cat: Category) => {
        setCatEdit(cat);
        setCatForm({ name: cat.name, order: cat.order, isActive: cat.isActive });
        setCatDialog(true);
    };
    const saveCat = async () => {
        if (!catForm.name.trim()) return;
        setCatSaving(true);
        try {
            if (catEdit) {
                await fetch(`/api/gift-categories/${catEdit.id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(catForm) });
            } else {
                await fetch('/api/gift-categories', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(catForm) });
            }
            setCatDialog(false);
            fetchAll();
        } finally { setCatSaving(false); }
    };
    const deleteCat = async () => {
        if (!catDeleteTarget) return;
        setCatDeleteLoading(true);
        try {
            await fetch(`/api/gift-categories/${catDeleteTarget.id}`, { method: 'DELETE', headers });
            setCatDeleteTarget(null);
            fetchAll();
        } finally { setCatDeleteLoading(false); }
    };

    // ---- Gift CRUD ----
    const openGiftCreate = (catId: number) => {
        setGiftEdit(null);
        setGiftForm({ ...emptyGiftForm, categoryId: catId });
        setGiftDialog(true);
    };
    const openGiftEdit = (g: GiftItem) => {
        setGiftEdit(g);
        setGiftForm({ categoryId: g.categoryId, name: g.name, imageUrl: g.imageUrl, svgaUrl: g.svgaUrl || '', price: g.price, isVisible: g.isVisible, order: g.order });
        setGiftDialog(true);
    };

    const uploadFile = async (file: File, type: 'image' | 'svga') => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', type);
        const res = await fetch('/api/gifts/upload', { method: 'POST', headers, body: fd });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        return data.url as string;
    };
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setImageUploading(true);
        try { const url = await uploadFile(file, 'image'); setGiftForm(f => ({ ...f, imageUrl: url })); }
        finally { setImageUploading(false); if (imageInputRef.current) imageInputRef.current.value = ''; }
    };
    const handleAnimChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setAnimUploading(true);
        try { const url = await uploadFile(file, 'svga'); setGiftForm(f => ({ ...f, svgaUrl: url })); }
        finally { setAnimUploading(false); if (animInputRef.current) animInputRef.current.value = ''; }
    };

    const saveGift = async () => {
        if (!giftForm.name.trim() || !giftForm.categoryId || !giftForm.imageUrl || giftForm.price < 0) return;
        setGiftSaving(true);
        try {
            if (giftEdit) {
                await fetch(`/api/gifts/${giftEdit.id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(giftForm) });
            } else {
                await fetch('/api/gifts', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(giftForm) });
            }
            setGiftDialog(false);
            fetchAll();
        } finally { setGiftSaving(false); }
    };
    const deleteGift = async () => {
        if (!giftDeleteTarget) return;
        setGiftDeleteLoading(true);
        try {
            await fetch(`/api/gifts/${giftDeleteTarget.id}`, { method: 'DELETE', headers });
            setGiftDeleteTarget(null);
            fetchAll();
        } finally { setGiftDeleteLoading(false); }
    };

    const animExt = giftForm.svgaUrl ? giftForm.svgaUrl.split('.').pop()?.toLowerCase() : null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Hediyeler</h2>
                    <p className="text-muted-foreground">Kategoriler ve hediyeler.</p>
                </div>
                <Button onClick={openCatCreate}>
                    <Plus className="h-4 w-4 mr-2" /> Yeni Kategori
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
                    <Gift className="h-12 w-12 opacity-20" />
                    <p>Henüz kategori eklenmemiş.</p>
                    <Button variant="outline" size="sm" onClick={openCatCreate}>
                        <Plus className="h-4 w-4 mr-2" /> İlk Kategoriyi Ekle
                    </Button>
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
                    <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                            {categories.map(cat => (
                                <SortableCategoryItem
                                    key={cat.id}
                                    cat={cat}
                                    catGifts={giftsFor(cat.id)}
                                    isOpen={openCats.has(cat.id)}
                                    onToggle={() => toggleCat(cat.id)}
                                    onEdit={() => openCatEdit(cat)}
                                    onDelete={() => setCatDeleteTarget(cat)}
                                    onAddGift={() => openGiftCreate(cat.id)}
                                    onEditGift={openGiftEdit}
                                    onDeleteGift={setGiftDeleteTarget}
                                    sensors={sensors}
                                    onGiftDragEnd={handleGiftDragEnd(cat.id)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {/* ---- Category Dialog ---- */}
            <Dialog open={catDialog} onOpenChange={setCatDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{catEdit ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>İsim *</Label>
                            <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Kategori adı" />
                        </div>
                        <div className="space-y-1">
                            <Label>Sıra</Label>
                            <Input type="number" value={catForm.order || ''} onChange={e => setCatForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="catIsActive" checked={catForm.isActive} onChange={e => setCatForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-border cursor-pointer" />
                            <Label htmlFor="catIsActive">Aktif</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCatDialog(false)}>İptal</Button>
                        <Button onClick={saveCat} disabled={catSaving || !catForm.name.trim()}>
                            {catSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {catEdit ? 'Kaydet' : 'Ekle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---- Gift Dialog ---- */}
            <Dialog open={giftDialog} onOpenChange={setGiftDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{giftEdit ? 'Hediyeyi Düzenle' : 'Yeni Hediye'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>Kategori *</Label>
                            <select
                                value={giftForm.categoryId}
                                onChange={e => setGiftForm(f => ({ ...f, categoryId: parseInt(e.target.value) }))}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                                <option value={0} disabled>Kategori seç...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>İsim *</Label>
                            <Input value={giftForm.name} onChange={e => setGiftForm(f => ({ ...f, name: e.target.value }))} placeholder="Hediye adı" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Fiyat (coin) *</Label>
                                <Input type="number" min={0} value={giftForm.price || ''} onChange={e => setGiftForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))} />
                            </div>
                            <div className="space-y-1">
                                <Label>Sıra</Label>
                                <Input type="number" value={giftForm.order || ''} onChange={e => setGiftForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
                            </div>
                        </div>
                        {/* Image */}
                        <div className="space-y-1">
                            <Label>Hediye Görseli *</Label>
                            <div className="flex items-center gap-3">
                                {giftForm.imageUrl && (
                                    <div className="relative w-14 h-14 flex-shrink-0">
                                        <img src={giftForm.imageUrl} alt="" className="w-full h-full object-contain rounded-lg border" />
                                        <button onClick={() => setGiftForm(f => ({ ...f, imageUrl: '' }))} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                                <Button type="button" variant="outline" size="sm" disabled={imageUploading} onClick={() => imageInputRef.current?.click()}>
                                    {imageUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                    {giftForm.imageUrl ? 'Değiştir' : 'Yükle'}
                                </Button>
                                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </div>
                        </div>
                        {/* Animation */}
                        <div className="space-y-1">
                            <Label>Animasyon (SVGA / MP4 / GIF)</Label>
                            <div className="flex items-center gap-3 flex-wrap">
                                {giftForm.svgaUrl && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2 py-1.5 rounded border">
                                        <span className="text-emerald-600 font-medium uppercase">✓ {animExt} yüklendi</span>
                                        <button onClick={() => setGiftForm(f => ({ ...f, svgaUrl: '' }))}><X className="h-3 w-3" /></button>
                                    </div>
                                )}
                                {giftForm.svgaUrl && (
                                    <Button
                                        type="button" variant="outline" size="sm"
                                        onClick={() => setAnimPreview(giftForm.svgaUrl)}
                                    >
                                        <Play className="h-4 w-4 mr-1" /> Oynat
                                    </Button>
                                )}
                                <Button type="button" variant="outline" size="sm" disabled={animUploading} onClick={() => animInputRef.current?.click()}>
                                    {animUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                    {giftForm.svgaUrl ? 'Değiştir' : 'Yükle'}
                                </Button>
                                <input ref={animInputRef} type="file" accept=".svga,.mp4,.gif" className="hidden" onChange={handleAnimChange} />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="giftIsVisible" checked={giftForm.isVisible} onChange={e => setGiftForm(f => ({ ...f, isVisible: e.target.checked }))} className="h-4 w-4 rounded border-border cursor-pointer" />
                            <Label htmlFor="giftIsVisible">Görünür (mobile'da göster)</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGiftDialog(false)}>İptal</Button>
                        <Button onClick={saveGift} disabled={giftSaving || !giftForm.name.trim() || !giftForm.categoryId || !giftForm.imageUrl}>
                            {giftSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {giftEdit ? 'Kaydet' : 'Ekle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---- Delete Dialogs ---- */}
            <Dialog open={!!catDeleteTarget} onOpenChange={() => setCatDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Kategoriyi Sil</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{catDeleteTarget?.name}</span> kategorisini ve altındaki tüm hediyeleri silmek istiyor musunuz?
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCatDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={deleteCat} disabled={catDeleteLoading}>
                            {catDeleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!giftDeleteTarget} onOpenChange={() => setGiftDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Hediyeyi Sil</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{giftDeleteTarget?.name}</span> hediyesini silmek istiyor musunuz?
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGiftDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={deleteGift} disabled={giftDeleteLoading}>
                            {giftDeleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---- Animation preview dialog ---- */}
            <Dialog open={!!animPreview} onOpenChange={() => setAnimPreview(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Animasyon Önizleme</DialogTitle>
                    </DialogHeader>
                    {animPreview && (/\.mp4$/i.test(animPreview) ? (
                        <video
                            autoPlay
                            muted
                            src={animPreview}
                            onEnded={() => setAnimPreview(null)}
                            className="w-full rounded-xl"
                        />
                    ) : /\.gif$/i.test(animPreview) ? (
                        <img src={animPreview} className="w-full rounded-xl" alt="animation" />
                    ) : (
                        <SVGACanvas url={animPreview} onEnd={() => setAnimPreview(null)} />
                    ))}
                </DialogContent>
            </Dialog>
        </div>
    );
}
