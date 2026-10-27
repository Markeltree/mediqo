'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../../../components/Shell';
import { api } from '../../../lib/api';
import { Notice } from '../../../components/Feedback';

type StaffRow = { _id: string; name: string; email: string; phone?: string; role: string; isActive: boolean; mustChangePassword?: boolean };

function Staff() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [notice, setNotice] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<{ staff: StaffRow[] }>('/facility/staff').then((d) => setRows(d.staff));
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api<{ tempPassword: string }>('/facility/staff', {
        method: 'POST', body: JSON.stringify({ ...form, phone: form.phone || undefined }),
      });
      setNotice({ email: form.email, password: res.tempPassword });
      setForm({ name: '', email: '', phone: '' });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggle = async (s: StaffRow) => {
    await api(`/facility/staff/${s._id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !s.isActive }) });
    load();
  };

  return (
    <>
      <h1>Reception staff</h1>
      <p className="subtle">Receptionists sign in to this panel to confirm or cancel patient bookings. They cannot change doctors or departments.</p>

      {notice && (
        <div className="banner ok">
          Account created. Sign-in details (shown only once): <code>{notice.email}</code> / <code>{notice.password}</code>
          <button className="icon-btn" style={{ marginLeft: 8 }} onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <form className="toolbar card" style={{ padding: 12 }} onSubmit={add}>
        <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="input" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <button className="btn primary" style={{ height: 44, whiteSpace: 'nowrap' }}>Add receptionist</button>
      </form>
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s._id}>
              <td style={{ fontWeight: 600 }}>{s.name}</td>
              <td>{s.email}</td>
              <td style={{ textTransform: 'capitalize' }}>{s.role.replace('_', ' ')}</td>
              <td>
                <span className={`badge ${s.isActive ? 'ok' : 'no'}`}>{s.isActive ? 'Active' : 'Disabled'}</span>
                {s.mustChangePassword && <div className="cell-sub">Has not signed in yet</div>}
              </td>
              <td style={{ textAlign: 'right' }}>
                {s.role === 'receptionist' && (
                  <button className="btn" onClick={() => toggle(s)}>{s.isActive ? 'Disable' : 'Enable'}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function StaffPage() {
  return (
    <Shell allow={['facility_admin']}>
      <Staff />
    </Shell>
  );
}
