"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
        setError(data.message || 'Giriş başarısız');
      }
    } catch (err) {
      setError('Sunucu hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <a href="." className="navbar-brand navbar-brand-autodark">
            {/* Logo public klasöründe ise */}
            <img src="/img/logo.png" height="36" alt="Lomix" onError={(e) => {
              // Yedek logo (eğer img/logo.png yoksa)
              e.currentTarget.style.display = 'none';
            }} />
            <span className="ms-2" style={{ fontSize: '24px', fontWeight: 'bold' }}>LOMIX</span>
          </a>
        </div>
        <div className="card card-md">
          <div className="card-body">
            <h2 className="h2 text-center mb-4">Hesabınıza giriş yapın</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleLogin} autoComplete="off">
              <div className="mb-3">
                <label className="form-label">Email veya Kullanıcı Adı</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Kullanıcı adınız"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Şifre</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Şifreniz"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-footer">
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
