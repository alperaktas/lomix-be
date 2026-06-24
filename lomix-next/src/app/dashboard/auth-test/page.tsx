"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Loader2, Copy, ChevronDown, ChevronUp } from "lucide-react";

const GOOGLE_CLIENT_ID = "634480984589-ivvqhpci4cicup4ndvlrrcjn64hd47ua.apps.googleusercontent.com";

type ResultState = { ok: boolean; data: any; ms: number } | null;

function ResultBox({ result }: { result: ResultState }) {
    const [expanded, setExpanded] = useState(true);
    if (!result) return null;
    const json = JSON.stringify(result.data, null, 2);
    return (
        <div className={`mt-4 rounded-lg border text-sm overflow-hidden ${result.ok ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"}`}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-inherit">
                <div className="flex items-center gap-2">
                    {result.ok
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <XCircle className="h-4 w-4 text-rose-500" />}
                    <span className={`font-semibold ${result.ok ? "text-emerald-700" : "text-rose-700"}`}>
                        {result.ok ? "Başarılı" : "Hata"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">{result.ms}ms</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => navigator.clipboard.writeText(json)}
                        className="p-1 rounded hover:bg-black/5 text-muted-foreground"
                        title="Kopyala"
                    >
                        <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setExpanded(v => !v)} className="p-1 rounded hover:bg-black/5 text-muted-foreground">
                        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </div>
            {expanded && (
                <pre className="p-3 overflow-auto max-h-72 text-xs leading-relaxed whitespace-pre-wrap break-all">
                    {json}
                </pre>
            )}
        </div>
    );
}

async function callApi(url: string, body: object): Promise<ResultState> {
    const t0 = Date.now();
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return { ok: res.ok, data, ms: Date.now() - t0 };
    } catch (e: any) {
        return { ok: false, data: { error: e.message }, ms: Date.now() - t0 };
    }
}

// ─── Register + Verify ────────────────────────────────────────────────────────
function RegisterTab() {
    const [form, setForm] = useState({ username: "", email: "", password: "", gender: "male" });
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultState>(null);
    const [step, setStep] = useState<"register" | "verify">("register");
    const [registeredEmail, setRegisteredEmail] = useState("");

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const handleRegister = async () => {
        setLoading(true);
        const res = await callApi("/api/mobile/auth/register", form);
        setResult(res);
        setLoading(false);
        if (res?.ok) {
            setRegisteredEmail(form.email);
            setStep("verify");
        }
    };

    const handleVerify = async () => {
        setLoading(true);
        const res = await callApi("/api/mobile/auth/verify", { email: registeredEmail, code, type: "activation" });
        setResult(res);
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            {step === "register" ? (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Kullanıcı Adı</Label>
                            <Input placeholder="testuser" value={form.username} onChange={set("username")} />
                        </div>
                        <div className="space-y-1">
                            <Label>E-posta</Label>
                            <Input type="email" placeholder="test@example.com" value={form.email} onChange={set("email")} />
                        </div>
                        <div className="space-y-1">
                            <Label>Şifre</Label>
                            <Input type="password" placeholder="Sifre123!" value={form.password} onChange={set("password")} />
                        </div>
                        <div className="space-y-1">
                            <Label>Cinsiyet</Label>
                            <select
                                value={form.gender}
                                onChange={set("gender")}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="male">Erkek</option>
                                <option value="female">Kadın</option>
                            </select>
                        </div>
                    </div>
                    <Button onClick={handleRegister} disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Kayıt Ol
                    </Button>
                </>
            ) : (
                <>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                        <strong>{registeredEmail}</strong> adresine doğrulama kodu gönderildi.
                    </div>
                    <div className="space-y-1">
                        <Label>Doğrulama Kodu</Label>
                        <Input
                            placeholder="1234"
                            maxLength={4}
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            className="text-center text-xl tracking-widest"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setStep("register"); setResult(null); }} className="flex-1">
                            Geri
                        </Button>
                        <Button onClick={handleVerify} disabled={loading || code.length < 4} className="flex-1">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Doğrula
                        </Button>
                    </div>
                </>
            )}
            <ResultBox result={result} />
        </div>
    );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginTab() {
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultState>(null);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const handleLogin = async () => {
        setLoading(true);
        const res = await callApi("/api/mobile/auth/login", form);
        setResult(res);
        setLoading(false);
    };

    const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleLogin(); };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="space-y-1">
                    <Label>E-posta veya Kullanıcı Adı</Label>
                    <Input placeholder="test@example.com veya kullanici_adi" value={form.email} onChange={set("email")} onKeyDown={handleKey} />
                </div>
                <div className="space-y-1">
                    <Label>Şifre</Label>
                    <Input type="password" placeholder="••••••••" value={form.password} onChange={set("password")} onKeyDown={handleKey} />
                </div>
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Giriş Yap
            </Button>
            {result?.ok && result.data?.data?.token && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-1">
                    <p className="text-xs font-medium text-emerald-700">JWT Token</p>
                    <p className="text-xs font-mono break-all text-emerald-800">{result.data.data.token}</p>
                </div>
            )}
            <ResultBox result={result} />
        </div>
    );
}

// ─── Google Login ─────────────────────────────────────────────────────────────
declare global {
    interface Window {
        google?: any;
        handleGoogleCredential?: (res: any) => void;
    }
}

function GoogleTab() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultState>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [initialized, setInitialized] = useState(false);

    const handleCredential = useCallback(async (googleResponse: any) => {
        setLoading(true);
        setResult(null);
        const res = await callApi("/api/mobile/auth/google", { token: googleResponse.credential });
        setResult(res);
        setLoading(false);
    }, []);

    useEffect(() => {
        window.handleGoogleCredential = handleCredential;
    }, [handleCredential]);

    useEffect(() => {
        if (document.getElementById("google-gsi-script")) {
            setScriptLoaded(true);
            return;
        }
        const script = document.createElement("script");
        script.id = "google-gsi-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => setScriptLoaded(true);
        document.head.appendChild(script);
    }, []);

    useEffect(() => {
        if (!scriptLoaded || initialized) return;
        const tryInit = () => {
            if (!window.google?.accounts?.id) {
                setTimeout(tryInit, 200);
                return;
            }
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: (res: any) => window.handleGoogleCredential?.(res),
                context: "signin",
                ux_mode: "popup",
            });
            window.google.accounts.id.renderButton(
                document.getElementById("google-signin-btn"),
                { theme: "outline", size: "large", width: 360, text: "signin_with" }
            );
            setInitialized(true);
        };
        tryInit();
    }, [scriptLoaded, initialized]);

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Nasıl çalışır?</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Aşağıdaki "Sign in with Google" butonuna tıklayın</li>
                    <li>Google hesabınızı seçin</li>
                    <li>Google ID token otomatik olarak <code className="bg-muted px-1 rounded">/api/mobile/auth/google</code> endpoint'ine gönderilir</li>
                    <li>Kullanıcı yoksa otomatik kayıt, varsa giriş yapılır</li>
                </ul>
            </div>

            <div className="flex flex-col items-center gap-4 py-2">
                {loading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        API isteği yapılıyor...
                    </div>
                )}
                <div id="google-signin-btn" className={loading ? "opacity-50 pointer-events-none" : ""} />
                {!initialized && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Google yükleniyor...
                    </div>
                )}
            </div>

            {result?.ok && result.data?.data?.token && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-1">
                    <p className="text-xs font-medium text-emerald-700">JWT Token</p>
                    <p className="text-xs font-mono break-all text-emerald-800">{result.data.data.token}</p>
                </div>
            )}
            <ResultBox result={result} />
        </div>
    );
}

// ─── Resend Code ──────────────────────────────────────────────────────────────
function ResendTab() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultState>(null);

    const handle = async () => {
        setLoading(true);
        const res = await callApi("/api/mobile/auth/resend-code", { email });
        setResult(res);
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <Label>E-posta</Label>
                <Input type="email" placeholder="test@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <Button onClick={handle} disabled={loading || !email} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kodu Yeniden Gönder
            </Button>
            <ResultBox result={result} />
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AuthTestPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Auth Test</h2>
                <p className="text-muted-foreground">Mobil auth endpoint'lerini doğrudan test edin.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {[
                    { label: "Register", path: "/api/mobile/auth/register", method: "POST" },
                    { label: "Login", path: "/api/mobile/auth/login", method: "POST" },
                    { label: "Verify", path: "/api/mobile/auth/verify", method: "POST" },
                    { label: "Google", path: "/api/mobile/auth/google", method: "POST" },
                    { label: "Resend Code", path: "/api/mobile/auth/resend-code", method: "POST" },
                ].map(e => (
                    <div key={e.label} className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{e.method}</Badge>
                        <span className="font-mono text-muted-foreground">{e.path}</span>
                    </div>
                ))}
            </div>

            <Separator />

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Test Araçları</CardTitle>
                    <CardDescription>Her sekme ilgili endpoint'i test eder. Yanıtlar altında gösterilir.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="login">
                        <TabsList className="grid grid-cols-4 w-full">
                            <TabsTrigger value="login">Giriş</TabsTrigger>
                            <TabsTrigger value="register">Kayıt</TabsTrigger>
                            <TabsTrigger value="google">Google</TabsTrigger>
                            <TabsTrigger value="resend">Kod Gönder</TabsTrigger>
                        </TabsList>
                        <div className="mt-4">
                            <TabsContent value="login"><LoginTab /></TabsContent>
                            <TabsContent value="register"><RegisterTab /></TabsContent>
                            <TabsContent value="google"><GoogleTab /></TabsContent>
                            <TabsContent value="resend"><ResendTab /></TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
