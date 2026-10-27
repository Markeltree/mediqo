'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shell } from '../../components/Shell';
import { LocationFields } from '../../components/LocationFields';
import { api } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { AppointmentRow, Facility } from '../../lib/types';
import { Notice } from '../../components/Feedback';

const STATUS_COPY: Record<Facility['status'], { cls: string; text: string }> = {
  pending: { cls: 'warn', text: 'Under review by Mediqo. Patients will see you once approved — meanwhile you can set everything up.' },
  approved: { cls: 'ok', text: 'Live. Patients can find and book you in the Mediqo app.' },
  rejected: { cls: 'danger', text: 'Mediqo could not approve this application.' },
};

function Overview() {
  const { facility, canManage, reload, user } = useSession();
  const [pending, setPending] = useState<number | null>(null);
  const [today, setToday] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', licenseNo: '', lat: '', lng: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!facility) return;
    setForm({
      name: facility.name, phone: facility.phone || '', address: facility.address, licenseNo: facility.licenseNo || '',
      lat: String(facility.location.coordinates[1]), lng: String(facility.location.coordinates[0]),
    });
    api<{ appointments: AppointmentRow[] }>('/facility/appointments?scope=upcoming').then(({ appointments }) => {
      setPending(appointments.filter((a) => a.status === 'pending').length);
      const d = new Date().toDateString();
      setToday(appointments.filter((a) => new Date(a.startsAt).toDateString() === d && a.status !== 'cancelled').length);
    });
  }, [facility]);

  if (!facility) {
    return (
      <>
        <h1>No clinic yet</h1>
        <p className="subtle">
          Your doctor account is not linked to a clinic. Hospitals add you from their panel; to run your own clinic,
          sign out and <Link href="/register" className="link">register a clinic</Link> with a different email.
        </p>
      </>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api('/facility/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name, address: form.address, lat: Number(form.lat), lng: Number(form.lng),
          phone: form.phone || undefined, licenseNo: form.licenseNo || undefined,
        }),
      });
      await reload();
      setMsg(facility.status === 'rejected' ? 'Saved and resubmitted for review.' : 'Saved.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const status = STATUS_COPY[facility.status];
  const confirmer = facility.type === 'hospital' ? 'reception' : 'you';

  return (
    <>
      <h1>{facility.name}</h1>
      <p className="subtle">{facility.type === 'hospital' ? 'Hospital' : 'Clinic'} · {facility.address}</p>

      <div className={`banner ${status.cls}`}>
        {status.text}
        {facility.status === 'rejected' && facility.rejectionReason && <> Reason: <strong>{facility.rejectionReason}</strong>.</>}
        {facility.status === 'rejected' && canManage && ' Fix the details below and save to resubmit.'}
      </div>

      <div className="grid-stats">
        <Link href="/facility/appointments" className="card">
          <div className="stat-label">Waiting for {confirmer} to confirm</div>
          <div className="stat-value">{pending ?? '—'}</div>
        </Link>
        <div className="card">
          <div className="stat-label">Visits today</div>
          <div className="stat-value">{today ?? '—'}</div>
        </div>
      </div>

      {facility.type === 'hospital' && user.role === 'facility_admin' && (
        <div className="card steps">
          <strong>Setting up</strong>
          <ol>
            <li><Link href="/facility/departments" className="link">Create departments</Link> (Cardiology, Pediatrics…)</li>
            <li><Link href="/facility/doctors" className="link">Add doctors</Link> with their department, fee and OPD timings</li>
            <li><Link href="/facility/staff" className="link">Add reception staff</Link> who confirm patient bookings</li>
          </ol>
        </div>
      )}

      <h2>Details</h2>
      <form className="card form-grid" onSubmit={save}>
        <div className="field">
          <label>Name</label>
          <input className="input" value={form.name} disabled={!canManage} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="field">
          <label>Front desk phone</label>
          <input className="input" value={form.phone} disabled={!canManage} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="field full">
          <label>Address</label>
          <input className="input" value={form.address} disabled={!canManage} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
        </div>
        <div className="field">
          <label>Registration / license no.</label>
          <input className="input" value={form.licenseNo} disabled={!canManage} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} />
        </div>
        {canManage && (
          <>
            <LocationFields lat={form.lat} lng={form.lng} onChange={(lat, lng, address) => setForm((f) => ({ ...f, lat, lng, ...(address && { address }) }))} />
            <div className="field full">
              {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
              {msg && <Notice tone="success" onClose={() => setMsg('')}>{msg}</Notice>}
              <button className="btn primary" style={{ justifySelf: 'start' }}>Save details</button>
            </div>
          </>
        )}
      </form>
    </>
  );
}

export default function FacilityPage() {
  return (
    <Shell allow={['facility_admin', 'receptionist', 'doctor']}>
      <Overview />
    </Shell>
  );
}
