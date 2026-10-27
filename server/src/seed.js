require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Facility = require('./models/Facility');
const Department = require('./models/Department');
const Practice = require('./models/Practice');
const Appointment = require('./models/Appointment');
const { DEFAULT_AVAILABILITY } = require('./utils/schemas');

// Demo data around Karachi, Pakistan (lng, lat)
const DOCTORS = [
  { key: 'ayesha', name: 'Dr. Ayesha Khan', specialty: 'Dermatology' },
  { key: 'bilal', name: 'Dr. Bilal Ahmed', specialty: 'Cardiology' },
  { key: 'sara', name: 'Dr. Sara Malik', specialty: 'Pediatrics' },
  { key: 'omer', name: 'Dr. Omer Siddiqui', specialty: 'Dentist' },
];

const HOSPITAL = {
  name: 'City General Hospital', address: 'Shahrah-e-Faisal, Karachi', phone: '021-111-000-111',
  coords: [67.0736, 24.8615], departments: ['Cardiology', 'Pediatrics', 'Dermatology'],
  // Ayesha also sits here two days a week, besides her own clinic
  staff: [
    { doctor: 'bilal', department: 'Cardiology', fee: 4500 },
    { doctor: 'sara', department: 'Pediatrics', fee: 2500 },
    { doctor: 'ayesha', department: 'Dermatology', fee: 3500, days: [2, 4] },
  ],
};

const CLINICS = [
  { doctor: 'ayesha', name: 'Clifton Skin Clinic', address: 'Clifton Block 4', coords: [67.0822, 24.8607], fee: 3000, days: [1, 3, 5] },
  { doctor: 'omer', name: 'Smile Dental', address: 'DHA Phase 6', coords: [67.0671, 24.8138], fee: 2000 },
];

const point = (coords) => ({ type: 'Point', coordinates: coords });
const weekdays = (days) => (days ? days.map((day) => ({ day, start: '09:00', end: '17:00' })) : DEFAULT_AVAILABILITY);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([
    User.deleteMany({ email: /@demo\.mediqo/ }),
    Doctor.deleteMany({}), Facility.deleteMany({}), Department.deleteMany({}),
    Practice.deleteMany({}), Appointment.deleteMany({}),
  ]);
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const user = (name, email, role, extra = {}) => User.create({ name, email, passwordHash, role, ...extra });

  await user('Admin', 'admin@demo.mediqo', 'admin');
  await user('Demo Patient', 'patient@demo.mediqo', 'patient');

  const doctors = {};
  for (const d of DOCTORS) {
    const u = await user(d.name, `${d.key}@demo.mediqo`, 'doctor');
    doctors[d.key] = await Doctor.create({
      user: u._id, specialty: d.specialty, experienceYears: 8, rating: 4.7, isVerified: true,
      bio: `Experienced ${d.specialty.toLowerCase()} specialist.`,
    });
  }

  // Hospital: an admin who manages it and a receptionist who confirms bookings
  const hospitalAdmin = await user('Hospital Admin', 'hospital@demo.mediqo', 'facility_admin');
  const hospital = await Facility.create({
    type: 'hospital', name: HOSPITAL.name, address: HOSPITAL.address, phone: HOSPITAL.phone,
    location: point(HOSPITAL.coords), owner: hospitalAdmin._id, status: 'approved',
  });
  hospitalAdmin.facility = hospital._id;
  await hospitalAdmin.save();
  await user('Front Desk', 'reception@demo.mediqo', 'receptionist', { facility: hospital._id });

  const departments = {};
  for (const name of HOSPITAL.departments) {
    departments[name] = await Department.create({ facility: hospital._id, name });
  }
  for (const s of HOSPITAL.staff) {
    await Practice.create({
      doctor: doctors[s.doctor]._id, facility: hospital._id, department: departments[s.department]._id,
      fee: s.fee, availability: weekdays(s.days), location: hospital.location,
    });
  }

  // Clinics: owned and run by their doctor, who confirms their own bookings
  for (const c of CLINICS) {
    const doctor = doctors[c.doctor];
    const clinic = await Facility.create({
      type: 'clinic', name: c.name, address: c.address, location: point(c.coords), owner: doctor.user, status: 'approved',
    });
    await Practice.create({
      doctor: doctor._id, facility: clinic._id, fee: c.fee, availability: weekdays(c.days), location: clinic.location,
    });
  }

  console.log('Seeded. Demo password: Password123!');
  console.log('  admin@demo.mediqo      Mediqo platform admin (web)');
  console.log('  hospital@demo.mediqo   City General Hospital admin (web)');
  console.log('  reception@demo.mediqo  Hospital receptionist (web)');
  console.log('  ayesha@demo.mediqo     Doctor: own clinic + hospital');
  console.log('  patient@demo.mediqo    Patient (mobile)');
  await mongoose.disconnect();
})();
