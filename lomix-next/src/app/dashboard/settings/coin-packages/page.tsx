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
import { Loader2, Plus, Pencil, Trash2, Star, Coins, GripVertical } from "lucide-react";

type CoinPackage = {
    id: number; name: string; coinAmount: number; bonusAmount: number; price: number;
    currency: string; badgeText: string; isActive: boolean; isFeatured: boolean; order: number;
};

const EMPTY: Omit<CoinPackage, 'id'> = {
    name: '', coinAmount: 0, bonusAmount: 0, price: 0, currency: 'TRY', badgeText: '', isActive: true, isFeatured: false, order: 0,
};

function SortableCard({
    pkg, onEdit, onDelete, deleting,
}: {
    pkg: CoinPackage;
    onEdit: (p: CoinPackage) => void;
    onDelete: (id: number) => void;
    deleting: number | null;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pkg.id });

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
                ${!pkg.isActive ? 'opacity-50' : ''}
                ${pkg.isFeatured ? 'border-amber-300 ring-1 ring-amber-200' : ''}
                ${isDragging ? 'shadow-xl ring-2 ring-primary/30' : ''}`}
        >
            {pkg.isFeatured && (
                <div className="absolute -top-2.5 left-3">
                    <Badge className="bg-amber-400 text-amber-900 text-[10px] px-2 gap-1 border-amber-300">
                        <Star className="h-2.5 w-2.5 fill-current" /> Öne Çıkan
                    </Badge>
                </div>
            )}

            {/* Drag handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2.5 right-2.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
            >
                <GripVertical className="h-4 w-4" />
            </div>

            <div className="flex items-start justify-between pt-1 pr-5">
                <div>
                    <p className="font-semibold text-sm">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sıra: {pkg.order}</p>
                </div>
                <Badge variant={pkg.isActive ? "default" : "secondary"} className="text-xs">
                    {pkg.isActive ? "Aktif" : "Pasif"}
                </Badge>
            </div>

            <div className="rounded-lg bg-primary/5 px-3 py-2 text-center">
                <div className="text-2xl font-black text-primary">
                    {pkg.coinAmount.toLocaleString()}
                    {pkg.bonusAmount > 0 && (
                        <span className="text-base font-bold text-orange-500 ml-1">+{pkg.bonusAmount.toLocaleString()}</span>
                    )}
                </div>
                <div className="text-xs text-muted-foreground">coin</div>
            </div>

            <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-bold">{pkg.price} {pkg.currency}</span>
                {pkg.badgeText && (
                    <Badge className="text-[10px] px-1.5 bg-violet-100 text-violet-700 border-violet-200">{pkg.badgeText}</Badge>
                )}
            </div>

            <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1 h-8 gap-1" onClick={() => onEdit(pkg)}>
                    <Pencil className="h-3 w-3" /> Düzenle
                </Button>
                <Button
                    variant="outline" size="sm"
                    className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => onDelete(pkg.id)}
                    disabled={deleting === pkg.id}
                >
                    {deleting === pkg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </Button>
            </div>
        </div>
    );
}

export default function CoinPackagesPage() {
    const [packages, setPackages] = useState<CoinPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [reordering, setReordering] = useState(false);
    const [dialog, setDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; pkg: Omit<CoinPackage, 'id'> & { id?: number } }>({
        open: false, mode: 'create', pkg: { ...EMPTY },
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers = { Authorization: `Bearer ${token}` };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const load = () => {
        setLoading(true);
        fetch("/api/coin-packages", { headers })
            .then(r => r.json())
            .then(res => setPackages(res.data || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => setDialog({ open: true, mode: 'create', pkg: { ...EMPTY } });
    const openEdit = (p: CoinPackage) => setDialog({ open: true, mode: 'edit', pkg: { ...p } });

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = packages.findIndex(p => p.id === active.id);
        const newIndex = packages.findIndex(p => p.id === over.id);
        const reordered = arrayMove(packages, oldIndex, newIndex).map((p, i) => ({ ...p, order: i }));
        setPackages(reordered);

        setReordering(true);
        await fetch('/api/coin-packages', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(reordered.map(p => ({ id: p.id, order: p.order }))),
        });
        setReordering(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const { id, ...body } = dialog.pkg as CoinPackage;
        const isEdit = dialog.mode === 'edit' && id;
        await fetch(isEdit ? `/api/coin-packages/${id}` : '/api/coin-packages', {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
        });
        setSaving(false);
        setDialog(d => ({ ...d, open: false }));
        load();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Bu paketi silmek istediğinizden emin misiniz?')) return;
        setDeleting(id);
        await fetch(`/api/coin-packages/${id}`, { method: 'DELETE', headers });
        setDeleting(null);
        load();
    };

    const set = (k: keyof typeof EMPTY) => (val: any) =>
        setDialog(d => ({ ...d, pkg: { ...d.pkg, [k]: val } }));

    return (
        <div className="space-y-6 max-w-3xl animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Coin Paketleri</h2>
                    <p className="text-muted-foreground">
                        Kullanıcılara sunulacak satın alma paketlerini yönetin.
                        {reordering && <span className="ml-2 text-primary text-xs inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Kaydediliyor…</span>}
                    </p>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Yeni Paket
                </Button>
            </div>

            <Separator />

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : packages.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground space-y-3">
                    <Coins className="h-10 w-10 mx-auto opacity-30" />
                    <p>Henüz coin paketi eklenmemiş.</p>
                    <Button variant="outline" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> İlk Paketi Ekle</Button>
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={packages.map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {packages.map(pkg => (
                                <SortableCard
                                    key={pkg.id}
                                    pkg={pkg}
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{dialog.mode === 'create' ? 'Yeni Coin Paketi' : 'Paketi Düzenle'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>Paket Adı</Label>
                            <Input placeholder="Başlangıç Paketi" value={dialog.pkg.name} onChange={e => set('name')(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Coin Miktarı</Label>
                                <Input type="number" min={1} value={dialog.pkg.coinAmount || ''} onChange={e => set('coinAmount')(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1">
                                <Label>Bonus Coin <span className="text-orange-500 text-xs">(+ekstra)</span></Label>
                                <Input type="number" min={0} placeholder="0" value={dialog.pkg.bonusAmount || ''} onChange={e => set('bonusAmount')(Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Fiyat</Label>
                                <Input type="number" min={0} step="0.01" value={dialog.pkg.price || ''} onChange={e => set('price')(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1">
                                <Label>Para Birimi</Label>
                                <select
                                    value={dialog.pkg.currency}
                                    onChange={e => set('currency')(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                >
                                    <option value="TRY">TRY</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Etiket <span className="text-muted-foreground text-xs">(Popüler, Avantajlı…)</span></Label>
                                <Input placeholder="Popüler" value={dialog.pkg.badgeText} onChange={e => set('badgeText')(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Sıra</Label>
                                <Input type="number" min={0} value={dialog.pkg.order} onChange={e => set('order')(Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <p className="text-sm font-medium">Aktif</p>
                                <p className="text-xs text-muted-foreground">Mobilde görünsün mü?</p>
                            </div>
                            <input type="checkbox" className="h-4 w-4 cursor-pointer" checked={dialog.pkg.isActive} onChange={e => set('isActive')(e.target.checked)} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <p className="text-sm font-medium">Öne Çıkan</p>
                                <p className="text-xs text-muted-foreground">Paketi vurgula</p>
                            </div>
                            <input type="checkbox" className="h-4 w-4 cursor-pointer" checked={dialog.pkg.isFeatured} onChange={e => set('isFeatured')(e.target.checked)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(d => ({ ...d, open: false }))}>İptal</Button>
                        <Button onClick={handleSave} disabled={saving || !dialog.pkg.name || !dialog.pkg.coinAmount}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {dialog.mode === 'create' ? 'Oluştur' : 'Güncelle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
