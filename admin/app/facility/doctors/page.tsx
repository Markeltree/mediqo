'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Shell } from '../../../components/Shell';
import { ScheduleEditor } from '../../../components/ScheduleEditor';
import { api } from '../../../lib/api';
import { useSession } from '../../../lib/session';
import { SPECIALTIES, summarizeSchedule, type Department, type PracticeRow, type Slot } from '../../../lib/types';
import { Notice, useFeedback } from '../../../components/Feedback';
import { formatFee } from '../../../lib/format';

const DEFAULT_SLOTS: Slot[] = [1, 2, 3, 4, 5].map((day) => ({ day, start: '09:00', end: '17:00' }));

type Draft = { departmentId: string; fee: string; slotMinutes: string; availability: Slot[] };

function FeeLabel({ here }: { here?: boolean }) {
  const currency = useSession().facility?.currency || 'PKR';
  return <label>Consultation fee{here ? ' here' : ''} ({currency})</label>;
}

const draftOf = (p: PracticeRow): Draft => ({
  departmentId: p.department?._id ?? '',
  fee: String(p.fee),
  slotMinutes: String(p.slotMinutes),
  availability: p.availability.map(({ day, start, end }) => ({ day, start, end })),
});

function EditPanel({ practice, departments, isHospital, onDone }: {
  practice: PracticeRow; departments: Department[]; isHospital: boolean; onDone: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(draftOf(practice));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/facility/doctors/${practice._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(isHospital ? { departmentId: draft.departmentId || null } : {}),
          fee: Number(draft.fee),
          slotMinutes: Number(draft.slotMinutes),
          availability: draft.availability,
        }),
      });
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card edit-panel">
      <div className="form-grid">
        {isHospital && (
          <div className="field">
            <label>Department</label>
            <select className="input" value={draft.departmentId} onChange={(e) => setDraft({ ...draft, departmentId: e.target.value })}>
              <option value="">— None —</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <FeeLabel />
          <input className="input" type="number" min={0} value={draft.fee} onChange={(e) => setDraft({ ...draft, fee: e.target.value })} />
        </div>
        <div className="field">
          <label>Minutes per patient</label>
          <select className="input" value={draft.slotMinutes} onChange={(e) => setDraft({ ...draft, slotMinutes: e.target.value })}>
            {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
        <div className="field full">
          <label>OPD timings</label>
          <ScheduleEditor value={draft.availability} onChange={(availability) => setDraft({ ...draft, availability })} />
        </div>
      </div>
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
      <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

function AddDoctorForm({ departments, onAdded }: { departments: Department[]; onAdded: (tempPassword?: string, name?: string, email?: string) => void }) {
  const [form, setForm] = useState({ email: '', name: '', specialty: SPECIALTIES[0], departmentId: '', fee: '' });
  const [availability, setAvailability] = useState<Slot[]>(DEFAULT_SLOTS);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ doctor: PracticeRow; tempPassword?: string }>('/facility/doctors', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          name: form.name || undefined,
          specialty: form.specialty,
          departmentId: form.departmentId || undefined,
          fee: Number(form.fee || 0),
          availability,
        }),
      });
      onAdded(res.tempPassword, res.doctor.doctor.user.name, form.email);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card edit-panel" onSubmit={submit}>
      <p className="hint" style={{ marginTop: 0 }}>
        If the doctor already has a Mediqo account (for example they also sit at another hospital), just enter their email —
        they will be linked. Otherwise a new account is created and you get a temporary password to give them.
      </p>
      <div className="form-grid">
        <div className="field">
          <label>Doctor&apos;s email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="field">
          <label>Full name (new doctors)</label>
          <input className="input" placeholder="Dr. …" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Specialty</label>
          <select className="input" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}>
            {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Department</label>
          <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
            <option value="">— None —</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
        <div className="field">
          <FeeLabel here />
          <input className="input" type="number" min={0} value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
        </div>
        <div className="field full">
          <label>OPD timings at this hospital</label>
          <ScheduleEditor value={availability} onChange={setAvailability} />
        </div>
      </div>
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
      <button className="btn primary" disabled={busy} style={{ marginTop: 12 }}>{busy ? 'Adding…' : 'Add doctor'}</button>
    </form>
  );
}

function Doctors() {
  const { facility, canManage } = useSession();
  const { toast, confirm } = useFeedback();
  const isHospital = facility?.type === 'hospital';
  const [rows, setRows] = useState<PracticeRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<{ name: string; email: string; password?: string } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<{ doctors: PracticeRow[] }>('/facility/doctors').then((d) => setRows(d.doctors));
    if (isHospital) api<{ departments: Department[] }>('/facility/departments').then((d) => setDepartments(d.departments.filter((x) => x.isActive)));
  }, [isHospital]);

  useEffect(() => { load(); }, [load]);

  const setActive = async (p: PracticeRow, isActive: boolean) => {
    if (!isActive) {
      const ok = await confirm({
        title: `Remove ${p.doctor.user.name}?`,
        message: `They will stop taking bookings at ${facility?.name}. Past appointments are kept.`,
        confirmText: 'Remove doctor',
        danger: true,
      });
      if (!ok) return;
    }
    setError('');
    try {
      await api(`/facility/doctors/${p._id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
      toast({ tone: isActive ? 'success' : 'warning', title: isActive ? `${p.doctor.user.name} is active again` : `${p.doctor.user.name} removed` });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>{isHospital ? 'Doctors' : 'Fee & timings'}</h1>
      <p className="subtle">
        {isHospital
          ? 'Each doctor’s department, fee and OPD timings at this hospital. Mediqo verifies a doctor’s credentials once before patients can book them.'
          : 'Your consultation fee and the times patients can book at your clinic.'}
      </p>

      {notice && (
        <div className="banner ok">
          <strong>{notice.name}</strong> added.{' '}
          {notice.password ? (
            <>Give them these sign-in details (shown only once): <code>{notice.email}</code> / <code>{notice.password}</code>. They will be asked to set their own password.</>
          ) : (
            <>They already had a Mediqo account and can now see this hospital&apos;s appointments in their app.</>
          )}
          <button className="icon-btn" style={{ marginLeft: 8 }} onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {isHospital && canManage && (
        <div className="toolbar">
          <button className={`btn ${adding ? '' : 'primary'}`} onClick={() => setAdding(!adding)}>{adding ? 'Close' : 'Add doctor'}</button>
        </div>
      )}
      {adding && (
        <AddDoctorForm
          departments={departments}
          onAdded={(password, name, email) => {
            setAdding(false);
            setNotice({ name: name || '', email: email || '', password });
            load();
          }}
        />
      )}
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

      <table>
        <thead>
          <tr><th>Doctor</th>{isHospital && <th>Department</th>}<th>Fee</th><th>Timings</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <Fragment key={p._id}>
              <tr style={{ opacity: p.isActive ? 1 : 0.55 }}>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.doctor.user.name}</div>
                  <div className="cell-sub">{p.doctor.specialty} · {p.doctor.user.email}</div>
                </td>
                {isHospital && <td>{p.department?.name ?? '—'}</td>}
                <td>{formatFee(p.fee, facility?.currency)}</td>
                <td className="cell-sub" style={{ maxWidth: 260 }}>{summarizeSchedule(p.availability)} · {p.slotMinutes} min</td>
                <td>
                  {!p.isActive ? <span className="badge cancelled">Removed</span>
                    : p.doctor.isVerified ? <span className="badge ok">Bookable</span>
                      : <span className="badge no" title="Mediqo has not verified this doctor's credentials yet">Awaiting Mediqo verification</span>}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {canManage && p.isActive && (
                    <button className="btn" onClick={() => setEditing(editing === p._id ? null : p._id)}>Edit</button>
                  )}{' '}
                  {canManage && isHospital && (
                    <button className={`btn ${p.isActive ? 'danger' : ''}`} onClick={() => setActive(p, !p.isActive)}>
                      {p.isActive ? 'Remove' : 'Restore'}
                    </button>
                  )}
                </td>
              </tr>
              {editing === p._id && (
                <tr>
                  <td colSpan={isHospital ? 6 : 5} style={{ background: 'var(--bg)' }}>
                    <EditPanel practice={p} departments={departments} isHospital={isHospital} onDone={() => { setEditing(null); load(); }} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="empty">No doctors yet.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

export default function DoctorsPage() {
  return (
    <Shell allow={['facility_admin', 'receptionist', 'doctor']}>
      <Doctors />
    </Shell>
  );
}
