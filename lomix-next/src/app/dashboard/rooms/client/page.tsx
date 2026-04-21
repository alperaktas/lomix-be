"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, PhoneOff, Headphones, Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RemoteUser = { uid: number; audioMuted: boolean };

export default function RoomClientPage() {
    const [roomId, setRoomId] = useState("");
    const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");
    const [isMuted, setIsMuted] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
    const [log, setLog] = useState<string[]>([]);

    const clientRef = useRef<any>(null);
    const localTrackRef = useRef<any>(null);

    const addLog = (msg: string) =>
        setLog(prev => [`[${new Date().toLocaleTimeString("tr-TR")}] ${msg}`, ...prev].slice(0, 50));

    const handleJoin = async () => {
        if (!roomId.trim()) return;
        setStatus("connecting");
        addLog(`Odaya bağlanılıyor: ${roomId}`);

        try {
            const token = localStorage.getItem("token");

            // Mobile join endpoint — katılımcı listesine ekler
            const res = await fetch("/api/mobile/room/join", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ roomId }),
            });

            if (!res.ok) { addLog("❌ Token alınamadı"); setStatus("idle"); return; }

            const json = await res.json();
            const { channel_name, agora_token, uid } = json.data;
            const app_id = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
            addLog(`✅ Token alındı — UID: ${uid}`);

            const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
            AgoraRTC.setLogLevel(4); // sessiz log

            const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            clientRef.current = client;

            // Uzak kullanıcı gelince sesini çal
            client.on("user-published", async (remoteUser: any, mediaType: string) => {
                await client.subscribe(remoteUser, mediaType);
                if (mediaType === "audio") {
                    remoteUser.audioTrack?.play();
                    addLog(`🎙️ Kullanıcı ${remoteUser.uid} sesi açıldı`);
                    setRemoteUsers(prev => {
                        if (prev.find(u => u.uid === remoteUser.uid)) return prev;
                        return [...prev, { uid: remoteUser.uid, audioMuted: false }];
                    });
                }
            });

            client.on("user-unpublished", (remoteUser: any) => {
                addLog(`🔇 Kullanıcı ${remoteUser.uid} sesi kapandı`);
                setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
            });

            client.on("user-left", (remoteUser: any) => {
                addLog(`👤 Kullanıcı ${remoteUser.uid} odadan ayrıldı`);
                setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
            });

            await client.join(app_id, channel_name, agora_token, uid);
            addLog(`✅ Odaya katıldı: ${channel_name}`);

            // Mikrofon aç (admin dinleyici olarak katılabilir, mikrofon opsiyonel)
            try {
                const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
                localTrackRef.current = micTrack;
                await client.publish([micTrack]);
                addLog("🎤 Mikrofon açık");
            } catch {
                addLog("⚠️ Mikrofon erişimi yok, sadece dinleniyor");
            }

            setStatus("connected");
        } catch (err: any) {
            addLog(`❌ Hata: ${err.message}`);
            setStatus("idle");
        }
    };

    const handleLeave = async () => {
        try {
            localTrackRef.current?.stop();
            localTrackRef.current?.close();
            localTrackRef.current = null;
            await clientRef.current?.leave();
            clientRef.current = null;
            setRemoteUsers([]);
            setStatus("idle");
            addLog("📴 Odadan ayrıldı");
        } catch (err: any) {
            addLog(`❌ ${err.message}`);
        }
    };

    const toggleMute = async () => {
        if (!localTrackRef.current) return;
        if (isMuted) {
            await localTrackRef.current.setEnabled(true);
            addLog("🎤 Mikrofon açıldı");
        } else {
            await localTrackRef.current.setEnabled(false);
            addLog("🔇 Mikrofon kapatıldı");
        }
        setIsMuted(!isMuted);
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Oda Test İstemcisi</h1>
                <p className="text-sm text-zinc-500 mt-1">Sesli odaya web üzerinden katıl</p>
            </div>

            {/* Bağlan */}
            <div className="flex gap-2">
                <Input
                    placeholder="room_258130"
                    value={roomId}
                    onChange={e => setRoomId(e.target.value)}
                    className="h-9"
                    disabled={status !== "idle"}
                />
                {status === "idle" && (
                    <Button size="sm" className="h-9 gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 px-5"
                        onClick={handleJoin} disabled={!roomId.trim()}>
                        <Headphones className="h-4 w-4" /> Katıl
                    </Button>
                )}
                {status === "connecting" && (
                    <Button size="sm" className="h-9 px-5" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" />
                    </Button>
                )}
                {status === "connected" && (
                    <Button size="sm" className="h-9 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-5"
                        onClick={handleLeave}>
                        <PhoneOff className="h-4 w-4" /> Ayrıl
                    </Button>
                )}
            </div>

            {/* Durum */}
            {status === "connected" && (
                <div className="rounded-lg border border-zinc-200 bg-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-sm font-semibold text-zinc-800">{roomId}</span>
                        <span className="text-xs text-zinc-400">{remoteUsers.length} kullanıcı</span>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={toggleMute}>
                        {isMuted ? <><MicOff className="h-3.5 w-3.5 text-rose-500" /> Aç</> : <><Mic className="h-3.5 w-3.5" /> Kapat</>}
                    </Button>
                </div>
            )}

            {/* Uzak Kullanıcılar */}
            {remoteUsers.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Odadaki Kullanıcılar</p>
                    {remoteUsers.map(u => (
                        <div key={u.uid} className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-white px-4 py-2.5">
                            <div className="h-7 w-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                                <Volume2 className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            <span className="text-sm font-medium text-zinc-700">UID: {u.uid}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Log */}
            <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Log</p>
                <div className="rounded-lg border border-zinc-200 bg-zinc-950 p-3 font-mono text-xs text-emerald-400 max-h-64 overflow-y-auto flex flex-col gap-0.5">
                    {log.length === 0 && <span className="text-zinc-500">Henüz log yok...</span>}
                    {log.map((l, i) => <span key={i}>{l}</span>)}
                </div>
            </div>
        </div>
    );
}
