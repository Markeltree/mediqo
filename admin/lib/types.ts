export type Role = 'patient' | 'doctor' | 'facility_admin' | 'receptionist' | 'admin';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  facility?: string;
  mustChangePassword?: boolean;
};

export type Facility = {
  _id: string;
  type: 'hospital' | 'clinic';
  name: string;
  phone?: string;
  address: string;
  licenseNo?: string;
  timezone?: string;
  location: { coordinates: [number, number] };
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
};

export type Department = { _id: string; name: string; description?: string; isActive: boolean; doctorsCount?: number };

export type Slot = { day: number; start: string; end: string };

export type PracticeRow = {
  _id: string;
  fee: number;
  slotMinutes: number;
  availability: Slot[];
  isActive: boolean;
  department?: { _id: string; name: string } | null;
  doctor: {
    _id: string;
    specialty: string;
    isVerified: boolean;
    user: { name: string; email: string; phone?: string; isActive: boolean };
  };
};

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type AppointmentRow = {
  _id: string;
  startsAt: string;
  status: AppointmentStatus;
  fee?: number;
  reason?: string;
  actions?: ('confirm' | 'complete' | 'cancel')[];
  patient?: { name: string; phone?: string };
  doctor?: { specialty: string; user?: { name: string } };
  facility?: { name: string; type: 'hospital' | 'clinic' };
  practice?: { department?: { name: string } };
};

// Same list the AI triage maps symptoms onto (server/src/routes/ai.js)
export const SPECIALTIES = [
  'General Practice', 'Dentist', 'Dermatology', 'Cardiology', 'Gynecology', 'Pediatrics',
  'Orthopedics', 'Neurology', 'Psychiatry', 'Ophthalmology', 'ENT', 'Physiotherapy', 'Pharmacy',
];

export const DAY_NAMES =['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const STAFF_ROLES: Role[] = ['facility_admin', 'receptionist', 'doctor'];

/** Where each role lands after signing in. */
export const homeFor = (role: Role) => (role === 'admin' ? '/dashboard' : '/facility');

/** "Mon–Fri 09:00–17:00"-style summary of weekly timings. */
export function summarizeSchedule(slots: Slot[]) {
  if (!slots.length) return 'No timings';
  const groups = new Map<string, number[]>();
  for (const s of [...slots].sort((a, b) => a.day - b.day)) {
    const key = `${s.start}–${s.end}`;
    groups.set(key, [...(groups.get(key) || []), s.day]);
  }
  return [...groups.entries()].map(([time, days]) => `${days.map((d) => DAY_NAMES[d]).join(', ')} ${time}`).join(' · ');
}
