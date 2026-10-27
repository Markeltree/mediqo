'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';

type UserRow = { _id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string; facility?: { name: string } };

const ROLE_FILTERS = [
  ['', 'All'], ['patient', 'Patients'], ['doctor', 'Doctors'], ['facility_admin', 'Hospital admins'],
  ['receptionist', 'Receptionists'], ['admin', 'Mediqo admins'],
] as const;

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [role, setRole] = useState('');

  const load = useCallback(() => {
    api<{ users: UserRow[] }>(`/admin/users${role ? `?role=${role}` : ''}`).then((d) => setUsers(d.users));
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (u: UserRow) => {
    await api(`/admin/users/${u._id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive: !u.isActive }) });
    load();
  };

  return (
    <Shell>
      <h1>Users</h1>
      <p className="subtle">Everyone on Mediqo. Disabling an account blocks sign-in.</p>
      <div className="toolbar">
        {ROLE_FILTERS.map(([r, label]) => (
          <button key={r || 'all'} className={`btn ${role === r ? 'primary' : ''}`} onClick={() => setRole(r)}>
            {label}
          </button>
        ))}
      </div>
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Active</th><th /></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td style={{ fontWeight: 600 }}>{u.name}</td>
              <td>{u.email}</td>
              <td style={{ textTransform: 'capitalize' }}>
                {u.role.replace('_', ' ')}
                {u.facility && <div style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'none' }}>{u.facility.name}</div>}
              </td>
              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              <td><span className={`badge ${u.isActive ? 'ok' : 'no'}`}>{u.isActive ? 'Active' : 'Disabled'}</span></td>
              <td style={{ textAlign: 'right' }}>
                {u.role !== 'admin' && (
                  <button className="btn" onClick={() => toggleActive(u)}>{u.isActive ? 'Disable' : 'Enable'}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}
