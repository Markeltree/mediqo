'use client';

import { useEffect, useState } from 'react';
import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';
import { formatFee } from '../../lib/format';

type Row = {
  _id: string;
  startsAt: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  fee?: number;
  reason?: string;
  patient?: { name: string };
  doctor?: { specialty: string; user?: { name: string } };
  facility?: { name: string; type: string; currency?: string };
};

export default function AppointmentsPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    api<{ appointments: Row[] }>('/admin/appointments').then((d) => setRows(d.appointments));
  }, []);

  return (
    <Shell>
      <h1>Appointments</h1>
      <p className="subtle">The 200 most recent bookings across the platform.</p>
      <table>
        <thead>
          <tr><th>When</th><th>Patient</th><th>Doctor</th><th>Where</th><th>Reason</th><th>Fee</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a._id}>
              <td>{new Date(a.startsAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              <td>{a.patient?.name}</td>
              <td>
                {a.doctor?.user?.name}
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{a.doctor?.specialty}</div>
              </td>
              <td>
                {a.facility?.name}
                <div style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'capitalize' }}>{a.facility?.type}</div>
              </td>
              <td style={{ maxWidth: 240, color: 'var(--muted)' }}>{a.reason || '—'}</td>
              <td>{a.fee ? formatFee(a.fee, a.facility?.currency) : '—'}</td>
              <td><span className={`badge ${a.status}`}>{a.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}
