"use client";

import { useEffect, useState, useRef } from 'react';
import {
    DndContext, closestCenter, PointerSensor, TouchSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripVertical, GripHorizontal, Loader2, Play, Plus, Pencil, Trash2, Upload, X, Smile, ChevronDown, PackageOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Category { id: number; name: string; order: number; isActive: boolean; _count: { emojis: number } }
interface EmojiItem { id: number; categoryId: number; name: string; imageUrl: string; svgaUrl: string | null; price: number; isVisible: boolean; order: number }

function SortableEmojiItem({ e, onEdit, onDelete }: { e: EmojiItem; onEdit: () => void; onDelete: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: e.id });
    const animExt = e.svgaUrl?.split('.').pop()?.toUpperCase();
    return (
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn('relative rounded-xl border bg-muted/30 p-2.5 flex flex-col items-center gap-1.5', isDragging && 'opacity-40 shadow-xl z-50')}>
            <div {...attributes} {...listeners} className="absolute top-0.5 left-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none">
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
            <div className="flex items-center gap-0.5">
                <Smile className="h-2.5 w-2.5 text-amber-500" />
                <span className="text-[11px] text-amber-600 font-bold">{e.price}</span>
            </div>
            {e.svgaUrl && <span className="text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1 rounded">{animExt}</span>}
            <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                <button onClick={onEdit} className="h-5 w-5 flex items-center justify-center bg-background border rounded shadow text-muted-foreground hover:text-foreground"><Pencil className="h-2.5 w-2.5" /></button>
                <button onClick={onDelete} className="h-5 w-5 flex items-center justify-center bg-background border rounded shadow text-muted-foreground hover:text-rose-500"><Trash2 className="h-2.5 w-2.5" /></button>
            </div>
        </div>
    );
}

interface SortableCatProps {
    cat: Category; catEmojis: EmojiItem[]; isOpen: boolean;
    onToggle: () => void; onEdit: () => void; onDelete: () => void;
    onAddEmoji: () => void; onEditEmoji: (e: EmojiItem) => void; onDeleteEmoji: (e: EmojiItem) => void;
    sensors: ReturnType<typeof useSensors>; onEmojiDragEnd: (ev: DragEndEvent) => void;
}
function SortableCategoryItem({ cat, catEmojis, isOpen, onToggle, onEdit, onDelete, onAddEmoji, onEditEmoji, onDeleteEmoji, sensors, onEmojiDragEnd }: SortableCatProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
    return (
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn('rounded-xl border bg-card overflow-hidden', isDragging && 'opacity-40 shadow-2xl')}>
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/40 transition-colors" onClick={onToggle}>
                <button {...attributes} {...listeners} className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <GripVertical className="h-4 w-4" />
                </button>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0', isOpen && 'rotate-180')} />
                <span className="font-semibold flex-1">{cat.name}</span>
                <Badge variant="outline" className="text-xs">{catEmojis.length} emoji</Badge>
                <Badge variant={cat.isActive ? 'default' : 'secondary'} className="text-xs">{cat.isActive ? 'Aktif' : 'Pasif'}</Badge>
                <div className="flex gap-1.5 ml-1" onClick={e => e.stopPropagation()}>
                    <button onClick={onEdit} className="h-7 w-7 flex items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={onDelete} className="h-7 w-7 flex items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-rose-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
            </div>
            {isOpen && (
                <div className="border-t px-4 py-4 space-y-4">
                    {catEmojis.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                            <PackageOpen className="h-8 w-8 opacity-20" /><p className="text-sm">Bu kategoride henüz emoji yok.</p>
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEmojiDragEnd}>
                            <SortableContext items={catEmojis.map(e => e.id)} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                                    {catEmojis.map(e => <SortableEmojiItem key={e.id} e={e} onEdit={() => onEditEmoji(e)} onDelete={() => onDeleteEmoji(e)} />)}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                    <Button size="sm" variant="outline" className="w-full border-dashed" onClick={onAddEmoji}>
                        <Plus className="h-4 w-4 mr-2" /> Bu Kategoriye Emoji Ekle
                    </Button>
                </div>
            )}
        </div>
    );
}

const emptyCatForm = { name: '', order: 0, isActive: true };
const emptyEmojiForm = { categoryId: 0, name: '', imageUrl: '', svgaUrl: '', price: 0, isVisible: true, order: 0 };

export default function EmojisPage() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { Authorization: `Bearer ${token}` };
    const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };

    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [emojis, setEmojis] = useState<EmojiItem[]>([]);
    const [openCats, setOpenCats] = useState<Set<number>>(new Set());
    const [animPreview, setAnimPreview] = useState<string | null>(null);

    const [catDialog, setCatDialog] = useState(false);
    const [catEdit, setCatEdit] = useState<Category | null>(null);
    const [catForm, setCatForm] = useState(emptyCatForm);
    const [catSaving, setCatSaving] = useState(false);
    const [catDeleteTarget, setCatDeleteTarget] = useState<Category | null>(null);
    const [catDeleteLoading, setCatDeleteLoading] = useState(false);

    const [emojiDialog, setEmojiDialog] = useState(false);
    const [emojiEdit, setEmojiEdit] = useState<EmojiItem | null>(null);
    const [emojiForm, setEmojiForm] = useState(emptyEmojiForm);
    const [emojiSaving, setEmojiSaving] = useState(false);
    const [emojiDeleteTarget, setEmojiDeleteTarget] = useState<EmojiItem | null>(null);
    const [emojiDeleteLoading, setEmojiDeleteLoading] = useState(false);
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
            const [catRes, emojiRes] = await Promise.all([
                fetch('/api/emoji-categories', { headers }),
                fetch('/api/emojis', { headers }),
            ]);
            const cats: Category[] = (await catRes.json()).categories || [];
            setCategories(cats);
            setEmojis((await emojiRes.json()).emojis || []);
            setOpenCats(new Set(cats.map(c => c.id)));
        } finally { setLoading(false); }
    };
    useEffect(() => { fetchAll(); }, []);

    const toggleCat = (id: number) => setOpenCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const emojisFor = (catId: number) => emojis.filter(e => e.categoryId === catId);

    const handleCatDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const reordered = arrayMove(categories, categories.findIndex(c => c.id === active.id), categories.findIndex(c => c.id === over.id));
        setCategories(reordered.map((c, i) => ({ ...c, order: i })));
        reordered.forEach((c, i) => fetch(`/api/emoji-categories/${c.id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ name: c.name, order: i, isActive: c.isActive }) }));
    };

    const handleEmojiDragEnd = (catId: number) => (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const catEmojis = emojis.filter(e => e.categoryId === catId);
        const reordered = arrayMove(catEmojis, catEmojis.findIndex(e => e.id === active.id), catEmojis.findIndex(e => e.id === over.id));
        setEmojis(prev => [...prev.filter(e => e.categoryId !== catId), ...reordered.map((e, i) => ({ ...e, order: i }))]);
        reordered.forEach((e, i) => fetch(`/api/emojis/${e.id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ categoryId: e.categoryId, name: e.name, imageUrl: e.imageUrl, svgaUrl: e.svgaUrl, price: e.price, isVisible: e.isVisible, order: i }) }));
    };

    const openCatCreate = () => { setCatEdit(null); setCatForm(emptyCatForm); setCatDialog(true); };
    const openCatEdit = (cat: Category) => { setCatEdit(cat); setCatForm({ name: cat.name, order: cat.order, isActive: cat.isActive }); setCatDialog(true); };
    const saveCat = async () => {
        if (!catForm.name.trim()) return;
        setCatSaving(true);
        try {
            catEdit
                ? await fetch(`/api/emoji-categories/${catEdit.id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(catForm) })
                : await fetch('/api/emoji-categories', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(catForm) });
            setCatDialog(false); fetchAll();
        } finally { setCatSaving(false); }
    };
    const deleteCat = async () => {
        if (!catDeleteTarget) return;
        setCatDeleteLoading(true);
        try { await fetch(`/api/emoji-categories/${catDeleteTarget.id}`, { method: 'DELETE', headers }); setCatDeleteTarget(null); fetchAll(); }
        finally { setCatDeleteLoading(false); }
    };

    const openEmojiCreate = (catId: number) => { setEmojiEdit(null); setEmojiForm({ ...emptyEmojiForm, categoryId: catId }); setEmojiDialog(true); };
    const openEmojiEdit = (e: EmojiItem) => { setEmojiEdit(e); setEmojiForm({ categoryId: e.categoryId, name: e.name, imageUrl: e.imageUrl, svgaUrl: e.svgaUrl || '', price: e.price, isVisible: e.isVisible, order: e.order }); setEmojiDialog(true); };

    const uploadFile = async (file: File, type: 'image' | 'svga') => {
        const fd = new FormData(); fd.append('file', file); fd.append('type', type);
        const res = await fetch('/api/emojis/upload', { method: 'POST', headers, body: fd });
        const data = await res.json(); if (!data.success) throw new Error(data.message); return data.url as string;
    };
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return; setImageUploading(true);
        try { setEmojiForm(f => ({ ...f, imageUrl: '' })); const url = await uploadFile(file, 'image'); setEmojiForm(f => ({ ...f, imageUrl: url })); }
        finally { setImageUploading(false); if (imageInputRef.current) imageInputRef.current.value = ''; }
    };
    const handleAnimChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return; setAnimUploading(true);
        try { const url = await uploadFile(file, 'svga'); setEmojiForm(f => ({ ...f, svgaUrl: url })); }
        finally { setAnimUploading(false); if (animInputRef.current) animInputRef.current.value = ''; }
    };
    const saveEmoji = async () => {
        if (!emojiForm.name.trim() || !emojiForm.categoryId || !emojiForm.imageUrl || emojiForm.price < 0) return;
        setEmojiSaving(true);
        try {
            emojiEdit
                ? await fetch(`/api/emojis/${emojiEdit.id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(emojiForm) })
                : await fetch('/api/emojis', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(emojiForm) });
            setEmojiDialog(false); fetchAll();
        } finally { setEmojiSaving(false); }
    };
    const deleteEmoji = async () => {
        if (!emojiDeleteTarget) return; setEmojiDeleteLoading(true);
        try { await fetch(`/api/emojis/${emojiDeleteTarget.id}`, { method: 'DELETE', headers }); setEmojiDeleteTarget(null); fetchAll(); }
        finally { setEmojiDeleteLoading(false); }
    };

    const animExt = emojiForm.svgaUrl ? emojiForm.svgaUrl.split('.').pop()?.toLowerCase() : null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Emojiler</h2>
                    <p className="text-muted-foreground">Kategoriler ve emojiler.</p>
                </div>
                <Button onClick={openCatCreate}><Plus className="h-4 w-4 mr-2" /> Yeni Kategori</Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
                    <Smile className="h-12 w-12 opacity-20" /><p>Henüz kategori eklenmemiş.</p>
                    <Button variant="outline" size="sm" onClick={openCatCreate}><Plus className="h-4 w-4 mr-2" /> İlk Kategoriyi Ekle</Button>
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
                    <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                            {categories.map(cat => (
                                <SortableCategoryItem key={cat.id} cat={cat} catEmojis={emojisFor(cat.id)}
                                    isOpen={openCats.has(cat.id)} onToggle={() => toggleCat(cat.id)}
                                    onEdit={() => openCatEdit(cat)} onDelete={() => setCatDeleteTarget(cat)}
                                    onAddEmoji={() => openEmojiCreate(cat.id)}
                                    onEditEmoji={openEmojiEdit} onDeleteEmoji={setEmojiDeleteTarget}
                                    sensors={sensors} onEmojiDragEnd={handleEmojiDragEnd(cat.id)} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {/* Category Dialog */}
            <Dialog open={catDialog} onOpenChange={setCatDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{catEdit ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1"><Label>İsim *</Label><Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Kategori adı" /></div>
                        <div className="space-y-1"><Label>Sıra</Label><Input type="number" value={catForm.order || ''} onChange={e => setCatForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} /></div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="catActive" checked={catForm.isActive} onChange={e => setCatForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-border cursor-pointer" />
                            <Label htmlFor="catActive">Aktif</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCatDialog(false)}>İptal</Button>
                        <Button onClick={saveCat} disabled={catSaving || !catForm.name.trim()}>{catSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{catEdit ? 'Kaydet' : 'Ekle'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Emoji Dialog */}
            <Dialog open={emojiDialog} onOpenChange={setEmojiDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{emojiEdit ? 'Emojiyi Düzenle' : 'Yeni Emoji'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>Kategori *</Label>
                            <select value={emojiForm.categoryId} onChange={e => setEmojiForm(f => ({ ...f, categoryId: parseInt(e.target.value) }))} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                                <option value={0} disabled>Kategori seç...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1"><Label>İsim *</Label><Input value={emojiForm.name} onChange={e => setEmojiForm(f => ({ ...f, name: e.target.value }))} placeholder="Emoji adı" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><Label>Fiyat (coin) *</Label><Input type="number" min={0} value={emojiForm.price || ''} onChange={e => setEmojiForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))} /></div>
                            <div className="space-y-1"><Label>Sıra</Label><Input type="number" value={emojiForm.order || ''} onChange={e => setEmojiForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} /></div>
                        </div>
                        <div className="space-y-1">
                            <Label>İkon *</Label>
                            <div className="flex items-center gap-3">
                                {emojiForm.imageUrl && (
                                    <div className="relative w-14 h-14 flex-shrink-0">
                                        <img src={emojiForm.imageUrl} alt="" className="w-full h-full object-contain rounded-lg border" />
                                        <button onClick={() => setEmojiForm(f => ({ ...f, imageUrl: '' }))} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"><X className="h-3 w-3" /></button>
                                    </div>
                                )}
                                <Button type="button" variant="outline" size="sm" disabled={imageUploading} onClick={() => imageInputRef.current?.click()}>
                                    {imageUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}{emojiForm.imageUrl ? 'Değiştir' : 'Yükle'}
                                </Button>
                                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Animasyon (SVGA / MP4 / GIF)</Label>
                            <div className="flex items-center gap-3 flex-wrap">
                                {emojiForm.svgaUrl && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2 py-1.5 rounded border">
                                        <span className="text-emerald-600 font-medium uppercase">✓ {animExt} yüklendi</span>
                                        <button onClick={() => setEmojiForm(f => ({ ...f, svgaUrl: '' }))}><X className="h-3 w-3" /></button>
                                    </div>
                                )}
                                {emojiForm.svgaUrl && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => setAnimPreview(emojiForm.svgaUrl)}><Play className="h-4 w-4 mr-1" /> Oynat</Button>
                                )}
                                <Button type="button" variant="outline" size="sm" disabled={animUploading} onClick={() => animInputRef.current?.click()}>
                                    {animUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}{emojiForm.svgaUrl ? 'Değiştir' : 'Yükle'}
                                </Button>
                                <input ref={animInputRef} type="file" accept=".svga,.mp4,.gif" className="hidden" onChange={handleAnimChange} />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="emojiVisible" checked={emojiForm.isVisible} onChange={e => setEmojiForm(f => ({ ...f, isVisible: e.target.checked }))} className="h-4 w-4 rounded border-border cursor-pointer" />
                            <Label htmlFor="emojiVisible">Görünür (mobile'da göster)</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEmojiDialog(false)}>İptal</Button>
                        <Button onClick={saveEmoji} disabled={emojiSaving || !emojiForm.name.trim() || !emojiForm.categoryId || !emojiForm.imageUrl}>
                            {emojiSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{emojiEdit ? 'Kaydet' : 'Ekle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialogs */}
            <Dialog open={!!catDeleteTarget} onOpenChange={() => setCatDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Kategoriyi Sil</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{catDeleteTarget?.name}</span> kategorisini ve altındaki tüm emojileri silmek istiyor musunuz?</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCatDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={deleteCat} disabled={catDeleteLoading}>{catDeleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!emojiDeleteTarget} onOpenChange={() => setEmojiDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Emojiyi Sil</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{emojiDeleteTarget?.name}</span> emojisini silmek istiyor musunuz?</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEmojiDeleteTarget(null)}>İptal</Button>
                        <Button variant="destructive" onClick={deleteEmoji} disabled={emojiDeleteLoading}>{emojiDeleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Animation preview */}
            <Dialog open={!!animPreview} onOpenChange={() => setAnimPreview(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader className="sr-only"><DialogTitle>Animasyon Önizleme</DialogTitle></DialogHeader>
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
                player.loops = 1; player.clearsAfterStop = false; player.onFinished(onEnd);
                const parser = new Lib.Parser();
                parser.load(url, (item: any) => {
                    if (canvasRef.current && item.videoSize) { canvasRef.current.width = item.videoSize.width; canvasRef.current.height = item.videoSize.height; }
                    player.setVideoItem(item); player.startAnimation();
                }, (err: Error) => console.error('SVGA error', err));
            } catch (e) { console.error('SVGA init', e); }
        })();
        return () => { try { player?.stopAnimation(true); player?.clear(); } catch {} };
    }, [url]);
    return <canvas ref={canvasRef} className="w-full max-h-[50vh]" />;
}
