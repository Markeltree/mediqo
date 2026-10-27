'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, setToken } from '../../lib/api';
import { homeFor, type User } from '../../lib/types';
import { Notice } from '../../components/Feedback';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      });
      if (user.role === 'patient') throw new Error('Patients book through the Mediqo mobile app');
      setToken(token);
      router.replace(user.mustChangePassword ? '/account' : homeFor(user.role));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <Link href="/" className="brand" style={{ padding: 0, display: 'inline-block' }}>mediqo<span>.</span></Link>
        <p className="subtle" style={{ margin: '4px 0 0' }}>Sign in for hospitals, clinics and Mediqo staff</p>
        <form onSubmit={submit}>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
          <button className="btn primary" disabled={busy} style={{ height: 44 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="subtle" style={{ margin: '20px 0 0', textAlign: 'center' }}>
          New here? <Link href="/register" className="link">Register your hospital or clinic</Link>
        </p>
        <p className="subtle" style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 13 }}>
          <Link href="/" className="link">← Back to website</Link> · <Link href="/terms" className="link">Terms</Link> · <Link href="/privacy" className="link">Privacy</Link>
        </p>
      </div>
    </div>
  );
}
