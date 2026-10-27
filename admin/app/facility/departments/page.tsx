'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../../../components/Shell';
import { api } from '../../../lib/api';
import { useSession } from '../../../lib/session';
import type { Department } from '../../../lib/types';
import { Notice, useFeedback } from '../../../components/Feedback';

function Departments() {
  const { canManage } = useSession();
  const { toast, confirm } = useFeedback();
  const [rows, setRows] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<{ departments: Department[] }>('/facility/departments').then((d) => setRows(d.departments));
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setError('');
    try {
      await fn();
      if (done) toast({ tone: 'success', title: done });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api('/facility/departments', { method: 'POST', body: JSON.stringify({ name, description: description || undefined }) });
      setName('');
      setDescription('');
    }, `${name} added`);
  };

  return (
    <>
      <h1>Departments</h1>
      <p className="subtle">Patients browse your hospital by department, then pick a doctor.</p>

      {canManage && (
        <form className="toolbar card" style={{ padding: 12 }} onSubmit={add}>
          <input className="input" placeholder="Department name, e.g. Cardiology" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="input" placeholder="Short description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button className="btn primary" style={{ height: 44 }}>Add</button>
        </form>
      )}
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

      <table>
        <thead>
          <tr><th>Department</th><th>Doctors</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d._id}>
              <td>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                {d.description && <div className="cell-sub">{d.description}</div>}
              </td>
              <td>{d.doctorsCount}</td>
              <td><span className={`badge ${d.isActive ? 'ok' : 'no'}`}>{d.isActive ? 'Visible' : 'Hidden'}</span></td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {canManage && (
                  <>
                    <button className="btn" onClick={() => run(() => api(`/facility/departments/${d._id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !d.isActive }) }))}>
                      {d.isActive ? 'Hide' : 'Show'}
                    </button>{' '}
                    <button
                      className="btn danger"
                      onClick={async () => {
                        const ok = await confirm({ title: `Delete ${d.name}?`, message: 'Patients will no longer see this department.', confirmText: 'Delete', danger: true });
                        if (ok) run(() => api(`/facility/departments/${d._id}`, { method: 'DELETE' }), `${d.name} deleted`);
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4} className="empty">No departments yet. Add your first one above.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

export default function DepartmentsPage() {
  return (
    <Shell allow={['facility_admin', 'receptionist']}>
      <Departments />
    </Shell>
  );
}
