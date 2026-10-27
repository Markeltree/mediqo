const User = require('../models/User');

const idOf = (v) => String(v?._id ?? v);

/**
 * How the user relates to an appointment: 'patient', 'doctor', 'staff' (that hospital's admin or
 * receptionist), 'admin' (platform), or null. Expects appt.doctor.user and appt.facility to be populated.
 */
function roleInAppointment(user, appt) {
  if (user.role === 'admin') return 'admin';
  if (idOf(appt.patient) === String(user._id)) return 'patient';
  if (appt.doctor?.user && idOf(appt.doctor.user) === String(user._id)) return 'doctor';
  const isStaff = ['facility_admin', 'receptionist'].includes(user.role);
  if (isStaff && user.facility && idOf(appt.facility) === String(user.facility)) return 'staff';
  return null;
}

/**
 * The status changes this user may make. Hospitals: reception confirms. Clinics: the doctor confirms.
 * The doctor or staff mark a confirmed visit completed; any party can cancel an open booking until it starts.
 */
function allowedActions(user, appt) {
  const who = roleInAppointment(user, appt);
  if (!who) return { who, actions: [] };

  // Once the start time has passed a booking can only be closed out, not confirmed or cancelled
  const upcoming = new Date(appt.startsAt) > new Date();
  const actions = [];
  if (appt.status === 'pending' && upcoming) {
    const confirmer = appt.facility?.type === 'clinic' ? 'doctor' : 'staff';
    if (who === confirmer || who === 'admin') actions.push('confirm');
  }
  if (appt.status === 'confirmed' && ['doctor', 'staff', 'admin'].includes(who)) actions.push('complete');
  if (['pending', 'confirmed'].includes(appt.status) && upcoming) actions.push('cancel');
  return { who, actions };
}

/** Everyone who should hear about a change: patient, doctor, and for hospitals the front desk. */
async function partiesOf(appt) {
  const ids = [idOf(appt.patient), appt.doctor?.user && idOf(appt.doctor.user)];
  if (appt.facility?.type === 'hospital') {
    const staff = await User.find({
      facility: idOf(appt.facility), role: { $in: ['facility_admin', 'receptionist'] }, isActive: true,
    }).select('_id');
    ids.push(...staff.map((s) => String(s._id)));
  }
  return ids.filter(Boolean);
}

/** Adds `actions` to each appointment JSON so clients show only the buttons the server will accept. */
function withActions(user, appointments) {
  return appointments.map((a) => ({ ...a.toObject(), actions: allowedActions(user, a).actions }));
}

module.exports = { roleInAppointment, allowedActions, partiesOf, withActions, idOf };
