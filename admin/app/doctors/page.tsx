'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';
import { formatFee } from '../../lib/format';

type DoctorRow = {
  _id: string;
  specialty: string;
  licenseNo?: string;
  experienceYears?: number;
  isVerified: boolean;
  user: { name: string; email: string; phone?: string };
  practices: { fee: number; facility: { name: string; type: 'hospital' | 'clinic'; status: string; currency?: string } }[];
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');

  const load = useCallback(() => {
    const qs = filter === 'pending' ? '?verified=false' : '';
    api<{ doctors: DoctorRow[] }>(`/admin/doctors${qs}`).then((d) => setDoctors(d.doctors));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string, isVerified: boolean) => {
    await api(`/admin/doctors/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ isVerified }) });
    load();
  };

  return (
    <Shell>
      <h1>Doctors</h1>
      <p className="subtle">Verify a doctor&apos;s credentials once; it applies at every hospital and clinic they sit at.</p>
      <div className="toolbar">
        <button className={`btn ${filter === 'pending' ? 'primary' : ''}`} onClick={() => setFilter('pending')}>Awaiting verification</button>
        <button className={`btn ${filter === 'all' ? 'primary' : ''}`} onClick={() => setFilter('all')}>All</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Specialty</th><th>License no.</th><th>Sits at</th><th>Status</th><th />
          </tr>
        </thead>
        <tbody>
          {doctors.map((d) => (
            <tr key={d._id}>
              <td>
                <div style={{ fontWeight: 600 }}>{d.user?.name}</div>
                <div className="cell-sub">{d.user?.email}</div>
              </td>
              <td>
                {d.specialty}
                {d.experienceYears ? <div className="cell-sub">{d.experienceYears} yrs</div> : null}
              </td>
              <td className="cell-sub">{d.licenseNo || '—'}</td>
              <td>
                {d.practices.length === 0 && <span className="cell-sub">Not attached anywhere</span>}
                {d.practices.map((p, i) => (
                  <div key={i} style={{ fontSize: 13 }}>
                    {p.facility.name} <span className="cell-sub">({p.facility.type}, {formatFee(p.fee, p.facility.currency)})</span>
                  </div>
                ))}
              </td>
              <td><span className={`badge ${d.isVerified ? 'ok' : 'no'}`}>{d.isVerified ? 'Verified' : 'Pending'}</span></td>
              <td style={{ textAlign: 'right' }}>
                <button className={`btn ${d.isVerified ? 'danger' : 'primary'}`} onClick={() => toggle(d._id, !d.isVerified)}>
                  {d.isVerified ? 'Revoke' : 'Verify'}
                </button>
              </td>
            </tr>
          ))}
          {doctors.length === 0 && (
            <tr><td colSpan={6} className="empty">Nothing here yet.</td></tr>
          )}
        </tbody>
      </table>
    </Shell>
  );
}
