"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Loader2, AlertCircle } from 'lucide-react';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setError(data.message || 'Giriş başarısız. Bilgilerinizi kontrol edin.');
      }
    } catch (err) {
      setError('Sunucu bağlantısı kurulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 font-sans">
      <div className="w-full max-w-[400px]">
        {/* Logo Bölümü */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="h-14 w-14">
            <img src="/img/logo.png" alt="Lomix" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1a1a1a]">Lomix Admin Paneli</h1>
        </div>

        <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-xl">
          <CardHeader className="pb-4 pt-8 text-center">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">Yönetici Girişi</CardTitle>
            <CardDescription className="text-sm">Devam etmek için oturum açın</CardDescription>
          </CardHeader>

          <CardContent className="pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-100 animate-in fade-in duration-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-semibold text-gray-700">Kullanıcı Adı / E-posta</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    placeholder="admin"
                    className="h-10 pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-lg"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-gray-700">Şifre</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-10 pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-lg"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                className="w-full h-11 bg-[#1a1a1a] hover:bg-[#333] text-white font-bold rounded-lg transition-all mt-2"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Giriş Yap"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-[11px] text-gray-400 font-medium tracking-wide">
          &copy; {new Date().getFullYear()} LOMIX
        </div>
      </div>
    </div>
  );
}
