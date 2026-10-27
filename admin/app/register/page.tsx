'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, setToken } from '../../lib/api';
import { LocationFields } from '../../components/LocationFields';
import { SPECIALTIES } from '../../lib/types';
import { Notice } from '../../components/Feedback';

type Kind = 'hospital' | 'clinic';

export default function RegisterPage() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('hospital');
  const [account, setAccount] = useState({ name: '', email: '', password: '', phone: '' });
  const [facility, setFacility] = useState({ name: '', phone: '', address: '', licenseNo: '', lat: '', lng: '' });
  const [doctor, setDoctor] = useState({ specialty: SPECIALTIES[0], experienceYears: '', licenseNo: '', fee: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(facility.lat);
    const lng = parseFloat(facility.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return setError('Enter a valid map location');
    setBusy(true);
    setError('');
    try {
      const body = {
        type: kind,
        account: { ...account, phone: account.phone || undefined },
        facility: {
          name: facility.name, address: facility.address, lat, lng,
          phone: facility.phone || undefined, licenseNo: facility.licenseNo || undefined,
        },
        doctor: kind === 'clinic'
          ? {
            specialty: doctor.specialty,
            experienceYears: doctor.experienceYears ? Number(doctor.experienceYears) : undefined,
            licenseNo: doctor.licenseNo || undefined,
            fee: doctor.fee ? Number(doctor.fee) : undefined,
          }
          : undefined,
      };
      const { token } = await api<{ token: string }>('/facilities/register', { method: 'POST', body: JSON.stringify(body) });
      setToken(token);
      router.replace('/facility');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isClinic = kind === 'clinic';

  return (
    <div className="login-wrap">
      <div className="card register-card">
        <div className="brand" style={{ padding: 0 }}>mediqo<span>.</span></div>
        <h1 style={{ marginTop: 12 }}>Join Mediqo</h1>
        <p className="subtle">Patients near you will find and book your doctors. Mediqo reviews every application before it goes live.</p>

        <div className="segmented">
          {(['hospital', 'clinic'] as const).map((k) => (
            <button key={k} type="button" className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
              <strong>{k === 'hospital' ? 'Hospital' : 'Clinic'}</strong>
              <span>{k === 'hospital' ? 'Departments, many doctors, a reception desk' : 'I am a doctor with my own practice'}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <h3>{isClinic ? 'Your account' : 'Hospital admin account'}</h3>
          <div className="form-grid">
            <div className="field">
              <label>{isClinic ? 'Full name (e.g. Dr. Sana Iqbal)' : 'Your name'}</label>
              <input className="input" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Mobile number</label>
              <input className="input" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} required />
            </div>
            <div className="field">
              <label>Password (min 8 characters)</label>
              <input className="input" type="password" minLength={8} value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} required />
            </div>
          </div>

          {isClinic && (
            <>
              <h3>Your practice</h3>
              <div className="form-grid">
                <div className="field">
                  <label>Specialty</label>
                  <select className="input" value={doctor.specialty} onChange={(e) => setDoctor({ ...doctor, specialty: e.target.value })}>
                    {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>PMDC registration no.</label>
                  <input className="input" value={doctor.licenseNo} onChange={(e) => setDoctor({ ...doctor, licenseNo: e.target.value })} />
                </div>
                <div className="field">
                  <label>Years of experience</label>
                  <input className="input" type="number" min={0} value={doctor.experienceYears} onChange={(e) => setDoctor({ ...doctor, experienceYears: e.target.value })} />
                </div>
                <div className="field">
                  <label>Consultation fee (PKR)</label>
                  <input className="input" type="number" min={0} value={doctor.fee} onChange={(e) => setDoctor({ ...doctor, fee: e.target.value })} />
                </div>
              </div>
            </>
          )}

          <h3>{isClinic ? 'Clinic' : 'Hospital'} details</h3>
          <div className="form-grid">
            <div className="field">
              <label>{isClinic ? 'Clinic' : 'Hospital'} name</label>
              <input className="input" value={facility.name} onChange={(e) => setFacility({ ...facility, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Front desk phone</label>
              <input className="input" value={facility.phone} onChange={(e) => setFacility({ ...facility, phone: e.target.value })} />
            </div>
            <div className="field full">
              <label>Address</label>
              <input className="input" value={facility.address} onChange={(e) => setFacility({ ...facility, address: e.target.value })} required />
            </div>
            <div className="field">
              <label>Registration / license no.</label>
              <input className="input" value={facility.licenseNo} onChange={(e) => setFacility({ ...facility, licenseNo: e.target.value })} />
            </div>
            <LocationFields lat={facility.lat} lng={facility.lng} onChange={(lat, lng, address) => setFacility((f) => ({ ...f, lat, lng, ...(address && { address }) }))} />
          </div>

          {isClinic && (
            <p className="hint">Your clinic starts with Mon–Fri 09:00–17:00 timings. You can change them after signing in.</p>
          )}
          {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
          <button className="btn primary" disabled={busy} style={{ height: 46, marginTop: 8 }}>
            {busy ? 'Submitting…' : `Submit ${isClinic ? 'clinic' : 'hospital'} for review`}
          </button>
        </form>
        <p className="subtle" style={{ margin: '20px 0 0', textAlign: 'center' }}>
          Already registered? <Link href="/login" className="link">Sign in</Link>
        </p>
        <p className="subtle" style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 13 }}>
          By registering you agree to our <Link href="/terms" className="link">Terms</Link> and <Link href="/privacy" className="link">Privacy Policy</Link>.{' '}
          <Link href="/" className="link">Back to website</Link>
        </p>
      </div>
    </div>
  );
}
