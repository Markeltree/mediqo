'use client';

import { useEffect, useState } from 'react';
import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';

type Stats = {
  patients: number;
  doctors: number;
  verifiedDoctors: number;
  hospitals: number;
  clinics: number;
  pendingFacilities: number;
  upcomingAppointments: number;
  totalAppointments: number;
};

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>('/admin/stats').then(setStats).catch(() => setStats(null));
  }, []);

  const tiles = stats
    ? [
        { label: 'Awaiting review', value: stats.pendingFacilities },
        { label: 'Hospitals', value: stats.hospitals },
        { label: 'Clinics', value: stats.clinics },
        { label: 'Patients', value: stats.patients },
        { label: 'Doctors', value: stats.doctors },
        { label: 'Verified doctors', value: stats.verifiedDoctors },
        { label: 'Upcoming visits', value: stats.upcomingAppointments },
        { label: 'All appointments', value: stats.totalAppointments },
      ]
    : [];

  return (
    <Shell>
      <h1>Overview</h1>
      <p className="subtle">A live snapshot of the Mediqo network.</p>
      <div className="grid-stats">
        {tiles.map((t, i) => (
          <div key={t.label} className="card" style={{ animation: `pageIn 0.5s ${i * 0.06}s both` }}>
            <div className="stat-label">{t.label}</div>
            <div className="stat-value">{t.value}</div>
          </div>
        ))}
      </div>
      {!stats && <p className="subtle">Loading metrics…</p>}
    </Shell>
  );
}
