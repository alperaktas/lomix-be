"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Radio, Loader2 } from "lucide-react";

type UserResult = { id: number; username: string; fullName: string | null; role: string };
type RoomResult = { id: number; roomId: string; name: string; isLive: boolean };

export function QuickSearch() {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<UserResult[]>([]);
    const [rooms, setRooms] = useState<RoomResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!query.trim()) { setUsers([]); setRooms([]); setOpen(false); return; }

        timerRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                    headers: { Authorization: "Bearer " + token },
                });
                const data = await res.json();
                setUsers(data.users || []);
                setRooms(data.rooms || []);
                setOpen(true);
            } finally {
                setLoading(false);
            }
        }, 300);
    }, [query]);

    const go = (path: string) => {
        setQuery("");
        setOpen(false);
        router.push(path);
    };

    const hasResults = users.length > 0 || rooms.length > 0;

    return (
        <div ref={wrapperRef} className="relative w-64">
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-500 focus-within:border-zinc-400 focus-within:ring-1 focus-within:ring-zinc-300 transition-all">
                {loading
                    ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-400" />
                    : <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                }
                <input
                    className="flex-1 bg-transparent outline-none placeholder:text-zinc-400 text-zinc-800"
                    placeholder="Hesap ID veya Oda ara..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => hasResults && setOpen(true)}
                />
            </div>

            {open && (
                <div className="absolute top-full mt-1.5 left-0 right-0 z-50 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
                    {!hasResults && !loading && (
                        <p className="px-4 py-3 text-xs text-zinc-400 text-center">Sonuç bulunamadı</p>
                    )}

                    {users.length > 0 && (
                        <div>
                            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Kullanıcılar</p>
                            {users.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => go(`/dashboard/users/${u.id}`)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 text-left transition-colors"
                                >
                                    <div className="h-7 w-7 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                        <User className="h-3.5 w-3.5 text-zinc-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-zinc-800 truncate">{u.fullName || u.username}</p>
                                        <p className="text-[11px] text-zinc-400">#{u.id} · {u.username}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {rooms.length > 0 && (
                        <div className={users.length > 0 ? "border-t border-zinc-100" : ""}>
                            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Odalar</p>
                            {rooms.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => go(`/dashboard/rooms/${r.id}`)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 text-left transition-colors"
                                >
                                    <div className="h-7 w-7 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                        <Radio className="h-3.5 w-3.5 text-zinc-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-zinc-800 truncate">{r.name}</p>
                                        <p className="text-[11px] text-zinc-400">{r.roomId} {r.isLive && <span className="text-emerald-500">· Canlı</span>}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="h-1.5" />
                </div>
            )}
        </div>
    );
}
