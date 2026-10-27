'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../../../components/Shell';
import { api } from '../../../lib/api';
import { useSession } from '../../../lib/session';
import type { AppointmentRow, AppointmentStatus } from '../../../lib/types';
import { Notice, useFeedback } from '../../../components/Feedback';

type Filter = 'pending' | 'upcoming' | 'past';

const ACTION_STATUS: Record<string, AppointmentStatus> = { confirm: 'confirmed', complete: 'completed', cancel: 'cancelled' };
const ACTION_LABEL: Record<string, string> = { confirm: 'Confirm', complete: 'Mark done', cancel: 'Cancel' };

function Appointments() {
  const { facility } = useSession();
  const { toast, confirm } = useFeedback();
  const [filter, setFilter] = useState<Filter>('pending');
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const qs = filter === 'pending' ? 'scope=upcoming&status=pending' : `scope=${filter}`;
    api<{ appointments: AppointmentRow[] }>(`/facility/appointments?${qs}`).then((d) => setRows(d.appointments));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const act = async (a: AppointmentRow, action: string) => {
    if (action === 'cancel') {
      const ok = await confirm({
        title: `Cancel ${a.patient?.name ?? 'this'}'s visit?`,
        message: 'The patient and doctor will be notified. This cannot be undone.',
        confirmText: 'Cancel visit',
        cancelText: 'Keep it',
        danger: true,
      });
      if (!ok) return;
    }
    setError('');
    try {
      await api(`/appointments/${a._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: ACTION_STATUS[action] }) });
      toast({
        tone: action === 'cancel' ? 'warning' : 'success',
        title: action === 'confirm' ? 'Appointment confirmed' : action === 'complete' ? 'Marked as done' : 'Appointment cancelled',
        message: `${a.patient?.name ?? 'The patient'} has been notified.`,
      });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isHospital = facility?.type === 'hospital';

  return (
    <>
      <h1>Appointments</h1>
      <p className="subtle">
        {isHospital
          ? 'New bookings arrive as requests. Reception confirms them; the patient and doctor are notified.'
          : 'New bookings arrive as requests. Confirm them and the patient is notified.'}
      </p>
      <div className="toolbar">
        {([['pending', 'Needs confirmation'], ['upcoming', 'All upcoming'], ['past', 'Past']] as const).map(([key, label]) => (
          <button key={key} className={`btn ${filter === key ? 'primary' : ''}`} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

      <table>
        <thead>
          <tr><th>When</th><th>Patient</th><th>Doctor</th><th>Reason</th><th>Fee</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a._id}>
              <td style={{ whiteSpace: 'nowrap' }}>
                {new Date(a.startsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                <div className="cell-sub">{new Date(a.startsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
              </td>
              <td>
                {a.patient?.name}
                {a.patient?.phone && <div className="cell-sub">{a.patient.phone}</div>}
              </td>
              <td>
                {a.doctor?.user?.name}
                <div className="cell-sub">{a.practice?.department?.name ?? a.doctor?.specialty}</div>
              </td>
              <td className="cell-sub" style={{ maxWidth: 220 }}>{a.reason || '—'}</td>
              <td>{a.fee ? `PKR ${a.fee}` : '—'}</td>
              <td><span className={`badge ${a.status}`}>{a.status}</span></td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {a.actions?.map((action) => (
                  <button
                    key={action}
                    className={`btn ${action === 'confirm' ? 'primary' : action === 'cancel' ? 'danger' : ''}`}
                    style={{ marginLeft: 6 }}
                    onClick={() => act(a, action)}
                  >
                    {ACTION_LABEL[action]}
                  </button>
                ))}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="empty">{filter === 'pending' ? 'All caught up — nothing waiting.' : 'No appointments.'}</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

export default function FacilityAppointmentsPage() {
  return (
    <Shell allow={['facility_admin', 'receptionist', 'doctor']}>
      <Appointments />
    </Shell>
  );
}
