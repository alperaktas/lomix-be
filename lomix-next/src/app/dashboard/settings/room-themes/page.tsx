"use client";

import { useEffect, useState } from "react";
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Crown, Palette, GripVertical, Upload, X } from "lucide-react";

type RoomTheme = {
    id: number;
    themeId: string;
    name: string;
    imageUrl: string;
    gradientColors: number[];
    isVip: boolean;
    requiredVipLevel: number;
    sortOrder: number;
    isActive: boolean;
};

type ThemeForm = Omit<RoomTheme, 'id'> & { id?: number };

const EMPTY: ThemeForm = {
    themeId: '', name: '', imageUrl: '', gradientColors: [7444799, 4933523],
    isVip: false, requiredVipLevel: 0, sortOrder: 0, isActive: true,
};

// Mobil taraf renkleri integer bekliyor (0xRRGGBB), panelde hex ile gosteriyoruz.
const intToHex = (value: number) => `#${(value >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
const hexToInt = (hex: string) => parseInt(hex.replace(/^#/, ''), 16) || 0;

function gradientStyle(colors: number[]) {
    if (!colors || colors.length === 0) return { background: '#e5e7eb' };
    if (colors.length === 1) return { background: intToHex(colors[0]) };
    return { background: `linear-gradient(135deg, ${colors.map(intToHex).join(', ')})` };
}

function SortableCard({
    theme, onEdit, onDelete, deleting,
}: {
    theme: RoomTheme;
    onEdit: (t: RoomTheme) => void;
    onDelete: (id: number) => void;
    deleting: number | null;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: theme.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative rounded-xl border bg-card p-4 space-y-3 shadow-sm transition-shadow hover:shadow-md
                ${!theme.isActive ? 'opacity-50' : ''}
                ${theme.isVip ? 'border-amber-300 ring-1 ring-amber-200' : ''}
                ${isDragging ? 'shadow-xl ring-2 ring-primary/30' : ''}`}
        >
            {theme.isVip && (
                <div className="absolute -top-2.5 left-3">
                    <Badge className="bg-amber-400 text-amber-900 text-[10px] px-2 gap-1 border-amber-300">
                        <Crown className="h-2.5 w-2.5 fill-current" /> VIP {theme.requiredVipLevel}
                    </Badge>
                </div>
            )}

            <div
                {...attributes}
                {...listeners}
                className="absolute top-2.5 right-2.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
            >
                <GripVertical className="h-4 w-4" />
            </div>

            <div className="flex items-start justify-between pt-1 pr-5">
                <div>
                    <p className="font-semibold text-sm">{theme.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{theme.themeId}</p>
                </div>
                <Badge variant={theme.isActive ? "default" : "secondary"} className="text-xs">
                    {theme.isActive ? "Aktif" : "Pasif"}
                </Badge>
            </div>

            <div
                className="relative h-24 rounded-lg overflow-hidden border"
                style={gradientStyle(theme.gradientColors)}
            >
                {theme.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={theme.imageUrl} alt={theme.name} className="absolute inset-0 h-full w-full object-cover" />
                )}
            </div>

            <div className="flex flex-wrap gap-1">
                {theme.gradientColors.map((c, i) => (
                    <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-muted/50">
                        {intToHex(c)} · {c}
                    </span>
                ))}
            </div>

            <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1 h-8 gap-1" onClick={() => onEdit(theme)}>
                    <Pencil className="h-3 w-3" /> Düzenle
                </Button>
                <Button
                    variant="outline" size="sm"
                    className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => onDelete(theme.id)}
                    disabled={deleting === theme.id}
                >
                    {deleting === theme.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </Button>
            </div>
        </div>
    );
}

export default function RoomThemesPage() {
    const [themes, setThemes] = useState<RoomTheme[]>([]);
    const [loading, setLoading] = useState(true);
    const [reordering, setReordering] = useState(false);
    const [dialog, setDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; theme: ThemeForm }>({
        open: false, mode: 'create', theme: { ...EMPTY },
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers = { Authorization: `Bearer ${token}` };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const load = () => {
        setLoading(true);
        fetch("/api/room-themes", { headers })
            .then(r => r.json())
            .then(res => setThemes(res.data || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setError(null);
        const nextOrder = themes.length ? Math.max(...themes.map(t => t.sortOrder)) + 1 : 1;
        setDialog({ open: true, mode: 'create', theme: { ...EMPTY, sortOrder: nextOrder } });
    };

    const openEdit = (t: RoomTheme) => {
        setError(null);
        setDialog({ open: true, mode: 'edit', theme: { ...t } });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = themes.findIndex(t => t.id === active.id);
        const newIndex = themes.findIndex(t => t.id === over.id);
        const reordered = arrayMove(themes, oldIndex, newIndex).map((t, i) => ({ ...t, sortOrder: i }));
        setThemes(reordered);

        setReordering(true);
        await fetch('/api/room-themes', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(reordered.map(t => ({ id: t.id, sortOrder: t.sortOrder }))),
        });
        setReordering(false);
    };

    const set = (k: keyof ThemeForm) => (val: any) =>
        setDialog(d => ({ ...d, theme: { ...d.theme, [k]: val } }));

    const handleUpload = async (file: File) => {
        setUploading(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/admin/upload', { method: 'POST', body: fd, headers });
            const json = await res.json();
            if (json.url) {
                set('imageUrl')(json.url);
            } else {
                setError(json.error || 'Görsel yüklenemedi.');
            }
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        const { id, ...body } = dialog.theme;
        const isEdit = dialog.mode === 'edit' && id;
        const res = await fetch(isEdit ? `/api/room-themes/${id}` : '/api/room-themes', {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        setSaving(false);
        if (!res.ok) {
            setError(json.message || 'Kaydedilemedi.');
            return;
        }
        setDialog(d => ({ ...d, open: false }));
        load();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Bu temayı silmek istediğinizden emin misiniz?')) return;
        setDeleting(id);
        const res = await fetch(`/api/room-themes/${id}`, { method: 'DELETE', headers });
        const json = await res.json();
        setDeleting(null);
        if (!res.ok) {
            alert(json.message || 'Tema silinemedi.');
            return;
        }
        load();
    };

    const setColor = (index: number) => (hex: string) =>
        setDialog(d => {
            const colors = [...d.theme.gradientColors];
            colors[index] = hexToInt(hex);
            return { ...d, theme: { ...d.theme, gradientColors: colors } };
        });

    const addColor = () =>
        setDialog(d => ({ ...d, theme: { ...d.theme, gradientColors: [...d.theme.gradientColors, 0] } }));

    const removeColor = (index: number) =>
        setDialog(d => ({
            ...d,
            theme: { ...d.theme, gradientColors: d.theme.gradientColors.filter((_, i) => i !== index) },
        }));

    return (
        <div className="space-y-6 max-w-3xl animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Oda Temaları</h2>
                    <p className="text-muted-foreground">
                        Mobilde <span className="font-mono text-xs">/api/mobile/room/themes</span> ile listelenen temalar.
                        {reordering && <span className="ml-2 text-primary text-xs inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Kaydediliyor…</span>}
                    </p>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Yeni Tema
                </Button>
            </div>

            <Separator />

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : themes.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground space-y-3">
                    <Palette className="h-10 w-10 mx-auto opacity-30" />
                    <p>Henüz tema eklenmemiş.</p>
                    <Button variant="outline" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> İlk Temayı Ekle</Button>
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={themes.map(t => t.id)} strategy={rectSortingStrategy}>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {themes.map(theme => (
                                <SortableCard
                                    key={theme.id}
                                    theme={theme}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    deleting={deleting}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            <Dialog open={dialog.open} onOpenChange={o => setDialog(d => ({ ...d, open: o }))}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{dialog.mode === 'create' ? 'Yeni Tema' : 'Temayı Düzenle'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Tema ID</Label>
                                <Input
                                    placeholder="room_1"
                                    value={dialog.theme.themeId}
                                    onChange={e => set('themeId')(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground">Mobile giden benzersiz id.</p>
                            </div>
                            <div className="space-y-1">
                                <Label>Tema Adı</Label>
                                <Input
                                    placeholder="Mor Menekşe"
                                    value={dialog.theme.name}
                                    onChange={e => set('name')(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Görsel</Label>
                            <div
                                className="relative h-28 rounded-lg overflow-hidden border"
                                style={gradientStyle(dialog.theme.gradientColors)}
                            >
                                {dialog.theme.imageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={dialog.theme.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 grid place-items-center bg-black/40">
                                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 pt-1">
                                <label className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUpload(file);
                                        }}
                                    />
                                    <span className="inline-flex w-full items-center justify-center gap-1 h-8 rounded-md border text-sm cursor-pointer hover:bg-accent">
                                        <Upload className="h-3 w-3" /> Görsel Yükle
                                    </span>
                                </label>
                                {dialog.theme.imageUrl && (
                                    <Button variant="outline" size="sm" className="h-8" onClick={() => set('imageUrl')('')}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Boş bırakılırsa istemci gradient renkleriyle çizer.
                            </p>
                        </div>

                        <div className="space-y-1">
                            <Label>Gradient Renkleri</Label>
                            <div className="space-y-2">
                                {dialog.theme.gradientColors.map((c, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={intToHex(c)}
                                            onChange={e => setColor(i)(e.target.value)}
                                            className="h-8 w-12 cursor-pointer rounded border bg-transparent"
                                        />
                                        <Input
                                            value={intToHex(c)}
                                            onChange={e => setColor(i)(e.target.value)}
                                            className="h-8 font-mono text-xs"
                                        />
                                        <span className="text-xs text-muted-foreground font-mono w-20 text-right">{c}</span>
                                        <Button
                                            variant="ghost" size="sm" className="h-8 px-2"
                                            onClick={() => removeColor(i)}
                                            disabled={dialog.theme.gradientColors.length <= 1}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" size="sm" className="h-7 mt-1 gap-1" onClick={addColor}>
                                <Plus className="h-3 w-3" /> Renk Ekle
                            </Button>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <p className="text-sm font-medium">VIP Teması</p>
                                <p className="text-xs text-muted-foreground">vip_themes listesinde yayınlanır</p>
                            </div>
                            <input
                                type="checkbox" className="h-4 w-4 cursor-pointer"
                                checked={dialog.theme.isVip}
                                onChange={e => set('isVip')(e.target.checked)}
                            />
                        </div>

                        {dialog.theme.isVip && (
                            <div className="space-y-1">
                                <Label>Gereken VIP Seviyesi</Label>
                                <Input
                                    type="number" min={0}
                                    value={dialog.theme.requiredVipLevel}
                                    onChange={e => set('requiredVipLevel')(Number(e.target.value))}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Sıra</Label>
                                <Input
                                    type="number" min={0}
                                    value={dialog.theme.sortOrder}
                                    onChange={e => set('sortOrder')(Number(e.target.value))}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <p className="text-sm font-medium">Aktif</p>
                                    <p className="text-xs text-muted-foreground">Mobilde görünsün mü?</p>
                                </div>
                                <input
                                    type="checkbox" className="h-4 w-4 cursor-pointer"
                                    checked={dialog.theme.isActive}
                                    onChange={e => set('isActive')(e.target.checked)}
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(d => ({ ...d, open: false }))}>İptal</Button>
                        <Button onClick={handleSave} disabled={saving || uploading || !dialog.theme.themeId || !dialog.theme.name}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {dialog.mode === 'create' ? 'Oluştur' : 'Güncelle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
