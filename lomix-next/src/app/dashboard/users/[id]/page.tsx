"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Loader2, RefreshCcw,
    Shield, ShieldAlert, ShieldCheck,
    Crown, Coins, Users, Heart, Building2,
    Ban, UserX, Smartphone, Gift, TrendingUp, Eye,
    Venus, Mars,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Action dialogs (Adım 4'te ayrı bileşen olarak refactor edilecek)
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface UserDetail {
    id: number;
    username: string;
    email: string;
    nickname: string | null;
    gender: string | null;
    role: string;
    status: string;
    level: number;
    isVip: boolean;
    vipLevel: number;
    vipExpiresAt: string | null;
    visitorViewLimit: number;
    bannedUntil: string | null;
    banReason: string | null;
    isPermanentBan: boolean;
    bannedDeviceId: string | null;
    createdAt: string;
    ipAddress: string | null;
    deviceModel: string | null;
    avatar: string | null;
    phone: string | null;
    followersCount: number;
    followingCount: number;
    wallet: { balance: number } | null;
    agencyMembership: { agency: { id: number; name: string; logo: string | null } } | null;
    bans: Array<{
        id: number; type: string; reason: string | null; duration: string | null;
        expiresAt: string | null; deviceId: string | null; isActive: boolean; createdAt: string;
    }>;
}

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const userId = Number(params.id);

    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [genderDialog, setGenderDialog] = useState(false);
    const [genderValue, setGenderValue] = useState('');
    const [banDialog, setBanDialog] = useState<'temporary' | 'permanent' | 'device' | null>(null);
    const [banReason, setBanReason] = useState('');
    const [banDuration, setBanDuration] = useState('1d');
    const [banDeviceId, setBanDeviceId] = useState('');
    const [coinsDialog, setCoinsDialog] = useState(false);
    const [coinsAmount, setCoinsAmount] = useState('');
    const [coinsAction, setCoinsAction] = useState<'add' | 'remove'>('add');
    const [coinsReason, setCoinsReason] = useState('');
    const [levelDialog, setLevelDialog] = useState(false);
    const [levelValue, setLevelValue] = useState('');
    const [vipDialog, setVipDialog] = useState(false);
    const [vipLevel, setVipLevel] = useState('1');
    const [vipDuration, setVipDuration] = useState('30d');
    const [storyDialog, setStoryDialog] = useState(false);
    const [storyCount, setStoryCount] = useState('1');
    const [visitorDialog, setVisitorDialog] = useState(false);
    const [visitorLimit, setVisitorLimit] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const fetchUser = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users/${userId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) setUser(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUser(); }, [userId]);

    // Generic action handler
    const handleAction = async (url: string, method: string, body: any, onSuccess?: () => void) => {
        setActionLoading(true);
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                onSuccess?.();
                fetchUser();
            } else {
                alert('Hata: ' + data.message);
            }
        } catch (err) { console.error(err); }
        finally { setActionLoading(false); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <p className="text-zinc-500">Kullanıcı bulunamadı.</p>
                <Button variant="outline" onClick={() => router.push('/dashboard/users')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Geri Dön
                </Button>
            </div>
        );
    }

    const isBanned = user.isPermanentBan || (user.bannedUntil && new Date(user.bannedUntil) > new Date());

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Back Button */}
            <Button variant="ghost" size="sm" className="w-fit gap-2 text-zinc-500 hover:text-zinc-900" onClick={() => router.push('/dashboard/users')}>
                <ArrowLeft className="h-4 w-4" /> Kullanıcı Listesi
            </Button>

            {/* ═══════ PROFILE CARD ═══════ */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center border-2 border-zinc-200 shadow-sm text-2xl font-bold text-zinc-400">
                            {user.avatar ? (
                                <img src={user.avatar} className="h-full w-full rounded-full object-cover" alt="" />
                            ) : (
                                user.username.charAt(0).toUpperCase()
                            )}
                        </div>
                        {user.isVip && (
                            <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-1 border-2 border-white shadow">
                                <Crown className="h-3 w-3 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl font-bold text-zinc-900">{user.username}</h1>
                            {user.nickname && <span className="text-sm text-zinc-400">({user.nickname})</span>}
                            <Badge variant="outline" className={
                                user.role === 'admin' ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold' :
                                user.role === 'moderator' ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold' :
                                'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                            }>
                                {user.role.toUpperCase()}
                            </Badge>
                            {isBanned && <Badge variant="destructive" className="font-bold">BANLI</Badge>}
                        </div>
                        <p className="text-sm text-zinc-500 mt-1">{user.email}</p>
                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                            <InfoPill icon={<TrendingUp className="h-3 w-3" />} label="Level" value={user.level} />
                            {user.isVip && <InfoPill icon={<Crown className="h-3 w-3 text-amber-500" />} label="VIP" value={`Lv.${user.vipLevel}`} className="text-amber-700 bg-amber-50 border-amber-200" />}
                            <InfoPill icon={<Coins className="h-3 w-3 text-emerald-500" />} label="Coins" value={user.wallet?.balance ?? 0} />
                            <InfoPill icon={<Heart className="h-3 w-3 text-rose-400" />} label="Takipçi" value={user.followersCount} />
                            <InfoPill icon={<Users className="h-3 w-3 text-blue-400" />} label="Takip" value={user.followingCount} />
                            <InfoPill icon={<Eye className="h-3 w-3" />} label="Ziyaretçi Limiti" value={user.visitorViewLimit} />
                        </div>
                    </div>

                    {/* Refresh */}
                    <Button variant="outline" size="sm" className="shrink-0" onClick={fetchUser}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* ═══════ TABS ═══════ */}
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="w-full justify-start border-b border-zinc-200 bg-transparent h-auto p-0 rounded-none gap-0">
                    <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
                    <TabsTrigger value="financial">Finansal</TabsTrigger>
                    <TabsTrigger value="social">Sosyal</TabsTrigger>
                    <TabsTrigger value="management">Yönetim</TabsTrigger>
                </TabsList>

                {/* ─── GENEL BİLGİLER ─── */}
                <TabsContent value="general" className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailCard label="Kullanıcı Adı" value={user.username} />
                        <DetailCard label="Email" value={user.email} />
                        <DetailCard label="Cinsiyet" value={user.gender === 'male' ? 'Erkek' : user.gender === 'female' ? 'Kadın' : user.gender || 'Belirtilmedi'}
                            action={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setGenderValue(user.gender || ''); setGenderDialog(true); }}>Değiştir</Button>}
                        />
                        <DetailCard label="Telefon" value={user.phone || '—'} />
                        <DetailCard label="IP Adresi" value={user.ipAddress || '—'} />
                        <DetailCard label="Cihaz" value={user.deviceModel || '—'} />
                        <DetailCard label="Durum" value={user.status} badge badgeClass={user.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'} />
                        <DetailCard label="Kayıt Tarihi" value={new Date(user.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })} />
                    </div>
                </TabsContent>

                {/* ─── FİNANSAL ─── */}
                <TabsContent value="financial" className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailCard label="Coins Bakiye" value={user.wallet?.balance ?? 0} className="text-lg font-bold"
                            action={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCoinsDialog(true)}>Ekle / Sil</Button>}
                        />
                        <DetailCard label="VIP Durumu" value={user.isVip ? `VIP Level ${user.vipLevel}` : 'VIP Değil'}
                            badge badgeClass={user.isVip ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}
                            action={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setVipDialog(true)}>Düzenle</Button>}
                        />
                        {user.isVip && user.vipExpiresAt && (
                            <DetailCard label="VIP Bitiş" value={new Date(user.vipExpiresAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })} />
                        )}
                        {user.isVip && !user.vipExpiresAt && (
                            <DetailCard label="VIP Bitiş" value="Süresiz" badge badgeClass="bg-emerald-50 text-emerald-700 border-emerald-200" />
                        )}
                    </div>
                </TabsContent>

                {/* ─── SOSYAL ─── */}
                <TabsContent value="social" className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailCard label="Takipçi Sayısı" value={user.followersCount} />
                        <DetailCard label="Takip Edilen" value={user.followingCount} />
                        <DetailCard label="Ajans" value={user.agencyMembership?.agency?.name || 'Yok'}
                            badge={!!user.agencyMembership}
                            badgeClass="bg-violet-50 text-violet-700 border-violet-200"
                        />
                    </div>
                </TabsContent>

                {/* ─── YÖNETİM ─── */}
                <TabsContent value="management" className="pt-6 space-y-6">
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        <ActionButton icon={<Venus className="h-4 w-4" />} label="Cinsiyet Değiştir" onClick={() => { setGenderValue(user.gender || ''); setGenderDialog(true); }} />
                        <ActionButton icon={<Ban className="h-4 w-4" />} label="Süreli Ban" onClick={() => setBanDialog('temporary')} variant="warning" />
                        <ActionButton icon={<UserX className="h-4 w-4" />} label="Kalıcı Ban" onClick={() => setBanDialog('permanent')} variant="danger" />
                        <ActionButton icon={<Smartphone className="h-4 w-4" />} label="Cihaz Ban" onClick={() => setBanDialog('device')} variant="danger" />
                        {isBanned && <ActionButton icon={<Shield className="h-4 w-4" />} label="Ban Kaldır" onClick={() => handleAction(`/api/users/${userId}/unban`, 'POST', {})} variant="success" />}
                        <ActionButton icon={<Coins className="h-4 w-4" />} label="Coins Ekle/Sil" onClick={() => setCoinsDialog(true)} />
                        <ActionButton icon={<Gift className="h-4 w-4" />} label="Story Ödülü" onClick={() => setStoryDialog(true)} />
                        <ActionButton icon={<TrendingUp className="h-4 w-4" />} label="Level Değiştir" onClick={() => { setLevelValue(String(user.level)); setLevelDialog(true); }} />
                        <ActionButton icon={<Crown className="h-4 w-4" />} label="VIP Tanımla" onClick={() => setVipDialog(true)} />
                        <ActionButton icon={<Eye className="h-4 w-4" />} label="Ziyaretçi Limiti" onClick={() => { setVisitorLimit(String(user.visitorViewLimit)); setVisitorDialog(true); }} />
                    </div>

                    {/* Ban History */}
                    {user.bans.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Ban Geçmişi</h3>
                            <div className="rounded-lg border border-zinc-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-zinc-50/50">
                                        <tr className="border-b border-zinc-100">
                                            <th className="text-left px-4 py-2.5 text-xs font-bold text-zinc-900 uppercase">Tür</th>
                                            <th className="text-left px-4 py-2.5 text-xs font-bold text-zinc-900 uppercase">Sebep</th>
                                            <th className="text-left px-4 py-2.5 text-xs font-bold text-zinc-900 uppercase">Süre</th>
                                            <th className="text-left px-4 py-2.5 text-xs font-bold text-zinc-900 uppercase">Durum</th>
                                            <th className="text-left px-4 py-2.5 text-xs font-bold text-zinc-900 uppercase">Tarih</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {user.bans.map(ban => (
                                            <tr key={ban.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                                                <td className="px-4 py-2.5">
                                                    <Badge variant="outline" className="text-xs font-bold">
                                                        {ban.type === 'temporary' ? 'Süreli' : ban.type === 'permanent' ? 'Kalıcı' : 'Cihaz'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-2.5 text-zinc-600">{ban.reason || '—'}</td>
                                                <td className="px-4 py-2.5 text-zinc-500">{ban.duration || '—'}</td>
                                                <td className="px-4 py-2.5">
                                                    <Badge variant="outline" className={ban.isActive ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-zinc-50 text-zinc-400 border-zinc-200'}>
                                                        {ban.isActive ? 'Aktif' : 'Pasif'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-2.5 text-zinc-400 text-xs">{new Date(ban.createdAt).toLocaleDateString('tr-TR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* ═══════ DIALOGS ═══════ */}

            {/* Gender Dialog */}
            <Dialog open={genderDialog} onOpenChange={setGenderDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Cinsiyet Değiştir</DialogTitle>
                        <DialogDescription>Kullanıcının cinsiyetini değiştirin.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950"
                            value={genderValue} onChange={e => setGenderValue(e.target.value)}>
                            <option value="">Seçin</option>
                            <option value="male">Erkek</option>
                            <option value="female">Kadın</option>
                            <option value="other">Diğer</option>
                        </select>
                        <DialogFooter>
                            <Button variant="ghost" size="sm" onClick={() => setGenderDialog(false)}>İptal</Button>
                            <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 font-semibold" disabled={actionLoading}
                                onClick={() => handleAction(`/api/users/${userId}/gender`, 'PUT', { gender: genderValue }, () => setGenderDialog(false))}>
                                Kaydet
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Ban Dialog */}
            <Dialog open={!!banDialog} onOpenChange={(open) => { if (!open) setBanDialog(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">
                            {banDialog === 'temporary' ? 'Süreli Ban' : banDialog === 'permanent' ? 'Kalıcı Ban' : 'Cihaz Ban'}
                        </DialogTitle>
                        <DialogDescription>
                            {banDialog === 'temporary' ? 'Belirli bir süre için hesabı askıya alın.' :
                             banDialog === 'permanent' ? 'Hesabı kalıcı olarak kapatın.' :
                             'Cihazı kalıcı olarak banla.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        {banDialog === 'temporary' && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-700">Süre</label>
                                <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950"
                                    value={banDuration} onChange={e => setBanDuration(e.target.value)}>
                                    <option value="1h">1 Saat</option>
                                    <option value="6h">6 Saat</option>
                                    <option value="12h">12 Saat</option>
                                    <option value="1d">1 Gün</option>
                                    <option value="3d">3 Gün</option>
                                    <option value="7d">7 Gün</option>
                                    <option value="14d">14 Gün</option>
                                    <option value="30d">30 Gün</option>
                                    <option value="90d">90 Gün</option>
                                    <option value="180d">180 Gün</option>
                                    <option value="365d">365 Gün</option>
                                </select>
                            </div>
                        )}
                        {banDialog === 'device' && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-700">Device ID / IMEI</label>
                                <Input className="h-9" value={banDeviceId} onChange={e => setBanDeviceId(e.target.value)} placeholder="Cihaz kimliğini girin" />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Sebep (opsiyonel)</label>
                            <Input className="h-9" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Ban sebebi" />
                        </div>
                        <DialogFooter className="pt-2 border-t border-zinc-100">
                            <Button variant="ghost" size="sm" onClick={() => setBanDialog(null)}>İptal</Button>
                            <Button variant="destructive" size="sm" className="font-semibold" disabled={actionLoading}
                                onClick={() => handleAction(`/api/users/${userId}/ban`, 'POST', {
                                    type: banDialog,
                                    reason: banReason,
                                    duration: banDialog === 'temporary' ? banDuration : undefined,
                                    deviceId: banDialog === 'device' ? banDeviceId : undefined,
                                }, () => { setBanDialog(null); setBanReason(''); })}>
                                Banla
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Coins Dialog */}
            <Dialog open={coinsDialog} onOpenChange={setCoinsDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Coins Yönetimi</DialogTitle>
                        <DialogDescription>Mevcut bakiye: <strong>{user.wallet?.balance ?? 0}</strong></DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <div className="flex gap-2">
                            <Button variant={coinsAction === 'add' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setCoinsAction('add')}>Ekle</Button>
                            <Button variant={coinsAction === 'remove' ? 'destructive' : 'outline'} size="sm" className="flex-1" onClick={() => setCoinsAction('remove')}>Sil</Button>
                        </div>
                        <Input className="h-9" type="number" placeholder="Miktar" value={coinsAmount} onChange={e => setCoinsAmount(e.target.value)} />
                        <Input className="h-9" placeholder="Açıklama (opsiyonel)" value={coinsReason} onChange={e => setCoinsReason(e.target.value)} />
                        <DialogFooter className="pt-2 border-t border-zinc-100">
                            <Button variant="ghost" size="sm" onClick={() => setCoinsDialog(false)}>İptal</Button>
                            <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 font-semibold" disabled={actionLoading}
                                onClick={() => handleAction(`/api/users/${userId}/coins`, 'POST', {
                                    amount: Number(coinsAmount), action: coinsAction, reason: coinsReason
                                }, () => { setCoinsDialog(false); setCoinsAmount(''); setCoinsReason(''); })}>
                                Uygula
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Level Dialog */}
            <Dialog open={levelDialog} onOpenChange={setLevelDialog}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Level Değiştir</DialogTitle>
                        <DialogDescription>Mevcut level: <strong>{user.level}</strong></DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <Input className="h-9" type="number" min="1" max="999" value={levelValue} onChange={e => setLevelValue(e.target.value)} />
                        <DialogFooter>
                            <Button variant="ghost" size="sm" onClick={() => setLevelDialog(false)}>İptal</Button>
                            <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 font-semibold" disabled={actionLoading}
                                onClick={() => handleAction(`/api/users/${userId}/level`, 'PUT', { level: Number(levelValue) }, () => setLevelDialog(false))}>
                                Kaydet
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* VIP Dialog */}
            <Dialog open={vipDialog} onOpenChange={setVipDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">VIP Tanımla</DialogTitle>
                        <DialogDescription>VIP seviyesini ve süresini belirleyin. Level 0 = kaldır.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">VIP Level</label>
                            <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950"
                                value={vipLevel} onChange={e => setVipLevel(e.target.value)}>
                                <option value="0">Kaldır</option>
                                {[1,2,3,4,5,6,7,8,9,10].map(l => <option key={l} value={String(l)}>Level {l}</option>)}
                            </select>
                        </div>
                        {vipLevel !== '0' && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-700">Süre</label>
                                <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950"
                                    value={vipDuration} onChange={e => setVipDuration(e.target.value)}>
                                    <option value="7d">7 Gün</option>
                                    <option value="30d">30 Gün</option>
                                    <option value="90d">90 Gün</option>
                                    <option value="180d">180 Gün</option>
                                    <option value="365d">365 Gün</option>
                                    <option value="permanent">Süresiz</option>
                                </select>
                            </div>
                        )}
                        <DialogFooter className="pt-2 border-t border-zinc-100">
                            <Button variant="ghost" size="sm" onClick={() => setVipDialog(false)}>İptal</Button>
                            <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 font-semibold" disabled={actionLoading}
                                onClick={() => handleAction(`/api/users/${userId}/vip`, 'PUT', {
                                    vipLevel: Number(vipLevel), duration: vipLevel === '0' ? undefined : vipDuration
                                }, () => setVipDialog(false))}>
                                Kaydet
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Story Reward Dialog */}
            <Dialog open={storyDialog} onOpenChange={setStoryDialog}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Story Ödülü Gönder</DialogTitle>
                        <DialogDescription>Kullanıcıya ücretsiz story hakkı verin.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <Input className="h-9" type="number" min="1" max="100" value={storyCount} onChange={e => setStoryCount(e.target.value)} placeholder="Adet" />
                        <DialogFooter>
                            <Button variant="ghost" size="sm" onClick={() => setStoryDialog(false)}>İptal</Button>
                            <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 font-semibold" disabled={actionLoading}
                                onClick={() => handleAction(`/api/users/${userId}/story-reward`, 'POST', { count: Number(storyCount) }, () => setStoryDialog(false))}>
                                Gönder
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Visitor Limit Dialog */}
            <Dialog open={visitorDialog} onOpenChange={setVisitorDialog}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Ziyaretçi Limiti</DialogTitle>
                        <DialogDescription>Mevcut limit: <strong>{user.visitorViewLimit}</strong></DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <Input className="h-9" type="number" min="0" max="9999" value={visitorLimit} onChange={e => setVisitorLimit(e.target.value)} />
                        <DialogFooter>
                            <Button variant="ghost" size="sm" onClick={() => setVisitorDialog(false)}>İptal</Button>
                            <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 font-semibold" disabled={actionLoading}
                                onClick={() => handleAction(`/api/users/${userId}/visitor-limit`, 'PUT', { limit: Number(visitorLimit) }, () => setVisitorDialog(false))}>
                                Kaydet
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── SUB COMPONENTS ───

function InfoPill({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: any; className?: string }) {
    return (
        <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 font-medium", className)}>
            {icon}
            <span className="text-zinc-400">{label}:</span>
            <span className="font-bold text-zinc-900">{value}</span>
        </div>
    );
}

function DetailCard({ label, value, badge, badgeClass, action, className }: {
    label: string; value: any; badge?: boolean; badgeClass?: string; action?: React.ReactNode; className?: string;
}) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</span>
                {action}
            </div>
            {badge ? (
                <Badge variant="outline" className={cn("w-fit font-bold mt-1", badgeClass)}>{value}</Badge>
            ) : (
                <span className={cn("text-sm font-semibold text-zinc-900", className)}>{value}</span>
            )}
        </div>
    );
}

function ActionButton({ icon, label, onClick, variant }: {
    icon: React.ReactNode; label: string; onClick: () => void; variant?: 'danger' | 'warning' | 'success';
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all hover:shadow-sm",
                variant === 'danger' ? 'border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100' :
                variant === 'warning' ? 'border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100' :
                variant === 'success' ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100' :
                'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            )}
        >
            {icon}
            {label}
        </button>
    );
}
