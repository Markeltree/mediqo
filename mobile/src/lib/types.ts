export type Role = 'patient' | 'doctor' | 'facility_admin' | 'receptionist' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  location?: { coordinates: [number, number]; address?: string };
  notificationsEnabled: boolean;
}

export type FacilityType = 'hospital' | 'clinic';

export interface FacilityRef {
  _id: string;
  name: string;
  type: FacilityType;
  address: string;
  phone?: string;
}

/** A doctor at one hospital or clinic: what a patient books. `_id` is the practice id. */
export interface Practice {
  _id: string;
  doctorId: string;
  name: string;
  avatarUrl?: string;
  specialty: string;
  bio?: string;
  experienceYears: number;
  fee: number;
  rating: number;
  reviewsCount: number;
  slotMinutes: number;
  facility: FacilityRef;
  department?: { _id?: string; name?: string };
  location: { coordinates: [number, number] };
  distanceKm?: number;
}

export interface Facility extends FacilityRef {
  location: { coordinates: [number, number] };
  distanceKm?: number;
  doctorsCount?: number;
  departments: { _id: string; name: string; description?: string }[];
}

export interface Slot {
  startsAt: string;
  endsAt: string;
  available: boolean;
}

export type AppointmentAction = 'confirm' | 'complete' | 'cancel';

export interface Appointment {
  _id: string;
  startsAt: string;
  endsAt: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  reason?: string;
  fee?: number;
  actions: AppointmentAction[];
  doctor?: { specialty: string; user?: { name: string } };
  patient?: { name: string; phone?: string };
  facility?: { name: string; type: FacilityType; address?: string };
  practice?: { department?: { name: string } };
}

export interface AppNotification {
  _id: string;
  title: string;
  body: string;
  data?: { type?: string; appointmentId?: string; facilityId?: string };
  read: boolean;
  createdAt: string;
}
