'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';
import { useSession } from '../../lib/session';
import { homeFor } from '../../lib/types';
import { Notice } from '../../components/Feedback';

function AccountForm() {
  const router = useRouter();
  const { user } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      setCurrent('');
      setNext('');
      if (user.mustChangePassword) router.replace(homeFor(user.role));
      else setMsg('Password updated.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Account</h1>
      <p className="subtle">{user.name} · {user.email}</p>
      {user.mustChangePassword && (
        <div className="banner warn">You signed in with a temporary password. Choose your own password to continue.</div>
      )}
      <form className="card" style={{ maxWidth: 420, display: 'grid', gap: 12 }} onSubmit={submit}>
        <div className="field">
          <label>{user.mustChangePassword ? 'Temporary password' : 'Current password'}</label>
          <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="field">
          <label>New password (min 8 characters)</label>
          <input className="input" type="password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
        {msg && <Notice tone="success" onClose={() => setMsg('')}>{msg}</Notice>}
        <button className="btn primary" style={{ height: 44 }}>Change password</button>
      </form>
    </>
  );
}

export default function AccountPage() {
  return (
    <Shell allow={['admin', 'facility_admin', 'receptionist', 'doctor']}>
      <AccountForm />
    </Shell>
  );
}
