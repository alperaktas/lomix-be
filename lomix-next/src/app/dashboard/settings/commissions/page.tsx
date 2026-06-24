"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Percent, Phone, Video, MessageCircle, Gift, Info } from "lucide-react";

type Setting = { key: string; label: string; group: string; value: string };

const GROUP_META: Record<string, { title: string; description: string; icon: React.ElementType; color: string }> = {
    commission: {
        title: "Komisyon Ayarları",
        description: "Gönderilen hediyelerden alınacak platform komisyon oranı.",
        icon: Gift,
        color: "text-orange-500",
    },
    pricing: {
        title: "Fiyat Ayarları",
        description: "Sesli arama, görüntülü arama ve mesajlaşma ücretleri.",
        icon: Phone,
        color: "text-blue-500",
    },
};

const KEY_META: Record<string, { icon: React.ElementType; unit: string; min: number; max: number; description: string }> = {
    gift_commission_rate:     { icon: Percent,       unit: "%",       min: 0,  max: 100, description: "Hediye tutarından kesilecek komisyon yüzdesi. Kalan yayıncının elmas bakiyesine eklenir." },
    voice_call_price_per_min: { icon: Phone,         unit: "coin/dk", min: 0,  max: 9999, description: "Sesli arama başlatmak için dakika başına düşen coin maliyeti." },
    video_call_price_per_min: { icon: Video,         unit: "coin/dk", min: 0,  max: 9999, description: "Görüntülü arama başlatmak için dakika başına düşen coin maliyeti." },
    message_price:            { icon: MessageCircle, unit: "coin",    min: 0,  max: 9999, description: "Her mesaj gönderimi için düşülecek coin miktarı." },
};

function CommissionExample({ rate }: { rate: number }) {
    const gift = 1000;
    const commission = Math.floor(gift * rate / 100);
    const diamond = gift - commission;
    return (
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 text-sm space-y-2">
            <p className="font-medium text-orange-800 flex items-center gap-1.5">
                <Info className="h-4 w-4" /> Örnek Hesaplama
            </p>
            <div className="text-orange-700 space-y-1">
                <div className="flex justify-between"><span>Gönderilen hediye değeri</span><span className="font-mono font-semibold">1.000 coin</span></div>
                <div className="flex justify-between"><span>Platform komisyonu (%{rate})</span><span className="font-mono font-semibold text-rose-600">-{commission} coin</span></div>
                <Separator className="bg-orange-200 my-1" />
                <div className="flex justify-between font-bold"><span>Yayıncıya yansıyan</span><span className="font-mono text-emerald-700">{diamond} elmas 💎</span></div>
            </div>
        </div>
    );
}

export default function CommissionsPage() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    useEffect(() => {
        fetch("/api/settings/commissions", { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(res => {
                if (res.data) {
                    setSettings(res.data);
                    const map: Record<string, string> = {};
                    for (const s of res.data) map[s.key] = s.value;
                    setValues(map);
                }
            })
            .finally(() => setLoading(false));
    }, [token]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        const payload: Record<string, number> = {};
        for (const [k, v] of Object.entries(values)) payload[k] = Number(v);
        await fetch("/api/settings/commissions", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const grouped = settings.reduce<Record<string, Setting[]>>((acc, s) => {
        if (!acc[s.group]) acc[s.group] = [];
        acc[s.group].push(s);
        return acc;
    }, {});

    const commissionRate = Number(values.gift_commission_rate ?? 20);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl animate-in fade-in duration-500">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Komisyon & Fiyat Ayarları</h2>
                    <p className="text-muted-foreground">Gelir paylaşımı ve özellik ücretlerini buradan yönetin.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saved ? "Kaydedildi ✓" : "Kaydet"}
                </Button>
            </div>

            <Separator />

            {["commission", "pricing"].map(group => {
                const meta = GROUP_META[group];
                const items = grouped[group] ?? [];
                if (!items.length) return null;
                const GroupIcon = meta.icon;

                return (
                    <Card key={group} className="shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <GroupIcon className={`h-5 w-5 ${meta.color}`} />
                                <CardTitle className="text-base">{meta.title}</CardTitle>
                            </div>
                            <CardDescription>{meta.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {items.map(setting => {
                                const km = KEY_META[setting.key];
                                const Icon = km?.icon ?? Info;
                                return (
                                    <div key={setting.key} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">{setting.label}</span>
                                            </div>
                                            <Badge variant="outline" className="text-xs font-mono">{km?.unit}</Badge>
                                        </div>
                                        <Input
                                            type="number"
                                            min={km?.min ?? 0}
                                            max={km?.max}
                                            value={values[setting.key] ?? ""}
                                            onChange={e => setValues(v => ({ ...v, [setting.key]: e.target.value }))}
                                            className="max-w-xs"
                                        />
                                        {km?.description && (
                                            <p className="text-xs text-muted-foreground">{km.description}</p>
                                        )}
                                    </div>
                                );
                            })}

                            {group === "commission" && (
                                <CommissionExample rate={commissionRate} />
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
