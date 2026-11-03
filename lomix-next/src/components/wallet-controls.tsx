"use client";

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
});

const fmt = (n: number) => n.toLocaleString('tr-TR');

type Restrictions = { withdrawBlocked: boolean; exchangeBlocked: boolean; spendBlocked: boolean };

const RESTRICTIONS: { key: keyof Restrictions; title: string; hint: string }[] = [
    { key: 'withdrawBlocked', title: 'Elmas çekim', hint: 'Kapalıyken kullanıcı elmasını çekemez.' },
    { key: 'exchangeBlocked', title: 'Değiş tokuş (elmas → coin)', hint: 'Kapalıyken kullanıcı elmasını coin ile bozduramaz.' },
    { key: 'spendBlocked', title: 'Coin harcama', hint: 'Kapalıyken hediye, hikaye ve ücretli mesajda coin harcayamaz.' },
];

/** Kullanıcının elmas çekim, değiş tokuş ve coin harcama işlemlerini tek tek kapatıp açar. */
export function WalletRestrictionsCard({ userId, initial }: { userId: number; initial: Restrictions }) {
    const [state, setState] = useState<Restrictions>(initial);
    const [busy, setBusy] = useState<keyof Restrictions | null>(null);
    const [error, setError] = useState('');

    useEffect(() => { setState(initial); }, [initial.withdrawBlocked, initial.exchangeBlocked, initial.spendBlocked]);

    const toggle = async (key: keyof Restrictions) => {
        setBusy(key); setError('');
        try {
            const res = await fetch(`/api/admin/users/${userId}/wallet-restrictions`, {
                method: 'PUT', headers: authHeaders(), body: JSON.stringify({ [key]: !state[key] }),
            });
            const json = await res.json();
            if (!res.ok) { setError(json.error || 'Güncellenemedi.'); return; }
            setState({ withdrawBlocked: json.withdrawBlocked, exchangeBlocked: json.exchangeBlocked, spendBlocked: json.spendBlocked });
        } catch { setError('Bağlantı hatası.'); }
        finally { setBusy(null); }
    };

    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
            <div>
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Cüzdan İşlemleri</span>
                <p className="text-xs text-zinc-500 mt-0.5">Bu kullanıcı için işlemleri tek tek kapatıp açabilirsiniz.</p>
            </div>
            <div className="divide-y divide-zinc-100">
                {RESTRICTIONS.map(r => {
                    const blocked = state[r.key];
                    return (
                        <div key={r.key} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-zinc-900">{r.title}</div>
                                <div className="text-xs text-zinc-500">{r.hint}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className={cn('font-bold', blocked ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
                                    {blocked ? 'Kapalı' : 'Açık'}
                                </Badge>
                                <Button size="sm" variant={blocked ? 'default' : 'outline'} disabled={busy !== null} onClick={() => toggle(r.key)}>
                                    {busy === r.key && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                                    {blocked ? 'Aç' : 'Kapat'}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
    );
}

type DiamondAction = 'add' | 'remove' | 'set' | 'reset';
const MODES: { key: DiamondAction; label: string }[] = [
    { key: 'add', label: 'Ekle' },
    { key: 'remove', label: 'Çıkar' },
    { key: 'set', label: 'Düzenle' },
    { key: 'reset', label: 'Sil' },
];

/** Elmas bakiyesi: ekle, çıkar, doğrudan değer yaz (düzenle) ya da sıfırla (sil). */
export function DiamondDialog({ open, onOpenChange, userId, balance, onDone }: {
    open: boolean; onOpenChange: (open: boolean) => void; userId: number; balance: number; onDone: () => void;
}) {
    const [action, setAction] = useState<DiamondAction>('add');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { if (open) { setAction('add'); setAmount(''); setReason(''); setError(''); } }, [open]);

    const n = Number(amount);
    const valid = action === 'reset' || (amount !== '' && Number.isInteger(n) && n >= (action === 'set' ? 0 : 1));
    const preview = !valid ? null
        : action === 'add' ? balance + n
        : action === 'remove' ? Math.max(0, balance - n)
        : action === 'set' ? n : 0;

    const submit = async () => {
        setBusy(true); setError('');
        try {
            const res = await fetch(`/api/users/${userId}/diamonds`, {
                method: 'POST', headers: authHeaders(),
                body: JSON.stringify({ action, ...(action !== 'reset' && { amount: n }), reason }),
            });
            const json = await res.json();
            if (!res.ok) { setError(json.message || 'İşlem yapılamadı.'); return; }
            onOpenChange(false);
            onDone();
        } catch { setError('Bağlantı hatası.'); }
        finally { setBusy(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Elmas Bakiyesi</DialogTitle>
                    <DialogDescription>Mevcut bakiye: <strong>{fmt(balance)}</strong> elmas</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-4 gap-2">
                        {MODES.map(m => (
                            <Button key={m.key} size="sm" variant={action === m.key ? (m.key === 'reset' || m.key === 'remove' ? 'destructive' : 'default') : 'outline'} onClick={() => setAction(m.key)}>
                                {m.label}
                            </Button>
                        ))}
                    </div>
                    {action !== 'reset' ? (
                        <Input className="h-9" type="number" min={action === 'set' ? 0 : 1} step={1}
                            placeholder={action === 'set' ? 'Yeni bakiye' : 'Miktar'} value={amount} onChange={e => setAmount(e.target.value)} />
                    ) : (
                        <p className="text-sm text-rose-600">Bakiye 0'a çekilecek.</p>
                    )}
                    <Input className="h-9" maxLength={200} placeholder="Açıklama (opsiyonel)" value={reason} onChange={e => setReason(e.target.value)} />
                    {preview !== null && <p className="text-xs text-zinc-500">Yeni bakiye: <strong>{fmt(preview)}</strong> elmas</p>}
                    {error && <p className="text-xs text-rose-600">{error}</p>}
                    <DialogFooter className="pt-2 border-t border-zinc-100">
                        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>İptal</Button>
                        <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 font-semibold" disabled={busy || !valid} onClick={submit}>
                            {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Uygula
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
