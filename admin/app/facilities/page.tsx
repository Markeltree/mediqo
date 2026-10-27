'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';
import type { Facility } from '../../lib/types';
import { Notice } from '../../components/Feedback';

type Row = Facility & {
  createdAt: string;
  doctorsCount: number;
  owner?: { name: string; email: string; phone?: string };
};

type Filter = 'pending' | 'approved' | 'rejected' | '';

export default function FacilitiesPage() {
  const [filter, setFilter] = useState<Filter>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<{ facilities: Row[] }>(`/admin/facilities${filter ? `?status=${filter}` : ''}`).then((d) => setRows(d.facilities));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (f: Row, status: 'approved' | 'rejected') => {
    let reason: string | undefined;
    if (status === 'rejected') {
      reason = prompt(`Why can't ${f.name} be approved? The applicant will see this.`) ?? undefined;
      if (reason === undefined) return;
    }
    setError('');
    try {
      await api(`/admin/facilities/${f._id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason: reason || undefined }) });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Shell>
      <h1>Hospitals & clinics</h1>
      <p className="subtle">Check registration details before a facility goes live. Clinic doctors also need their credentials verified under Doctors.</p>
      <div className="toolbar">
        {([['pending', 'Awaiting review'], ['approved', 'Live'], ['rejected', 'Rejected'], ['', 'All']] as const).map(([key, label]) => (
          <button key={key || 'all'} className={`btn ${filter === key ? 'primary' : ''}`} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
      <table>
        <thead>
          <tr><th>Name</th><th>Type</th><th>Contact</th><th>License</th><th>Doctors</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((f) => {
            const [lng, lat] = f.location.coordinates;
            return (
              <tr key={f._id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{f.name}</div>
                  <div className="cell-sub">
                    {f.address} ·{' '}
                    <a className="link" href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer">map</a>
                  </div>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{f.type}</td>
                <td>
                  {f.owner?.name}
                  <div className="cell-sub">{f.owner?.email}{f.phone ? ` · ${f.phone}` : ''}</div>
                </td>
                <td className="cell-sub">{f.licenseNo || '—'}</td>
                <td>{f.doctorsCount}</td>
                <td>
                  <span className={`badge ${f.status === 'approved' ? 'ok' : f.status === 'rejected' ? 'cancelled' : 'no'}`}>{f.status}</span>
                  {f.rejectionReason && <div className="cell-sub">{f.rejectionReason}</div>}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {f.status !== 'approved' && <button className="btn primary" onClick={() => setStatus(f, 'approved')}>Approve</button>}{' '}
                  {f.status !== 'rejected' && <button className="btn danger" onClick={() => setStatus(f, 'rejected')}>{f.status === 'approved' ? 'Suspend' : 'Reject'}</button>}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="empty">Nothing here.</td></tr>
          )}
        </tbody>
      </table>
    </Shell>
  );
}
