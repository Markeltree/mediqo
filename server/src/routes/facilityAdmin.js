const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { z } = require('zod');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const Practice = require('../models/Practice');
const Appointment = require('../models/Appointment');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { HttpError } = require('../middleware/error');
const { loadMyFacility, requireManager, requireHospital } = require('../middleware/facility');
const { withActions } = require('../services/appointmentRules');
const { availabilitySchema, facilityDetailsSchema, DEFAULT_AVAILABILITY } = require('../utils/schemas');

// Everything a hospital admin, receptionist or clinic doctor does for their own facility
const router = express.Router();

router.use(requireAuth, loadMyFacility);

const objectId = z.string().refine(mongoose.isValidObjectId, 'Invalid id');

// Readable, 12 chars; shown once to the admin who hands it over
const tempPassword = () => crypto.randomBytes(9).toString('base64url');

async function createStaffAccount({ name, email, phone, role, facility }) {
  const password = tempPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, phone, role, facility, passwordHash, mustChangePassword: true });
  return { user, password };
}

/* ---------- Facility details ---------- */

router.get('/me', async (req, res, next) => {
  try {
    const departments = await Department.find({ facility: req.facility._id }).sort({ name: 1 });
    res.json({ facility: req.facility, departments, canManage: req.canManage });
  } catch (err) {
    next(err);
  }
});

router.patch('/me', requireManager, validate(facilityDetailsSchema.partial()), async (req, res, next) => {
  try {
    const { lat, lng, ...rest } = req.body;
    Object.assign(req.facility, rest);
    const moved = lat !== undefined && lng !== undefined;
    if (moved) req.facility.location = { type: 'Point', coordinates: [lng, lat] };
    // Fixing a rejected application sends it back for review
    if (req.facility.status === 'rejected') {
      req.facility.status = 'pending';
      req.facility.rejectionReason = undefined;
    }
    await req.facility.save();
    if (moved) await Practice.updateMany({ facility: req.facility._id }, { location: req.facility.location });
    res.json({ facility: req.facility });
  } catch (err) {
    next(err);
  }
});

/* ---------- Departments (hospitals) ---------- */

const departmentSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

router.get('/departments', async (req, res, next) => {
  try {
    const departments = await Department.find({ facility: req.facility._id }).sort({ name: 1 }).lean();
    const counts = await Practice.aggregate([
      { $match: { facility: req.facility._id, isActive: true, department: { $ne: null } } },
      { $group: { _id: '$department', n: { $sum: 1 } } },
    ]);
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    res.json({ departments: departments.map((d) => ({ ...d, doctorsCount: byId[String(d._id)] || 0 })) });
  } catch (err) {
    next(err);
  }
});

router.post('/departments', requireManager, requireHospital, validate(departmentSchema), async (req, res, next) => {
  try {
    const department = await Department.create({ ...req.body, facility: req.facility._id }).catch((e) => {
      if (e.code === 11000) throw new HttpError(409, 'A department with this name already exists');
      throw e;
    });
    res.status(201).json({ department });
  } catch (err) {
    next(err);
  }
});

router.patch('/departments/:id', requireManager, requireHospital, validate(departmentSchema.partial()), async (req, res, next) => {
  try {
    const department = await Department.findOneAndUpdate(
      { _id: req.params.id, facility: req.facility._id }, req.body, { new: true, runValidators: true }
    ).catch((e) => {
      if (e.code === 11000) throw new HttpError(409, 'A department with this name already exists');
      throw e;
    });
    if (!department) throw new HttpError(404, 'Department not found');
    res.json({ department });
  } catch (err) {
    next(err);
  }
});

router.delete('/departments/:id', requireManager, requireHospital, async (req, res, next) => {
  try {
    const department = await Department.findOne({ _id: req.params.id, facility: req.facility._id });
    if (!department) throw new HttpError(404, 'Department not found');
    if (await Practice.exists({ department: department._id, isActive: true })) {
      throw new HttpError(409, 'Move or remove this department\'s doctors first, or deactivate it instead');
    }
    await department.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ---------- Doctors at this facility ---------- */

router.get('/doctors', async (req, res, next) => {
  try {
    const practices = await Practice.find({ facility: req.facility._id })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name email phone isActive' } })
      .populate('department', 'name')
      .sort({ isActive: -1, createdAt: -1 });
    res.json({ doctors: practices });
  } catch (err) {
    next(err);
  }
});

async function assertDepartment(facilityId, departmentId) {
  if (!departmentId) return;
  if (!(await Department.exists({ _id: departmentId, facility: facilityId }))) {
    throw new HttpError(400, 'Department does not belong to this hospital');
  }
}

const addDoctorSchema = z.object({
  email: z.string().email(),
  // Needed only when the doctor has no Mediqo account / profile yet
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(20).optional(),
  specialty: z.string().min(2).optional(),
  departmentId: objectId.optional(),
  fee: z.number().min(0).default(0),
  availability: availabilitySchema.optional(),
  slotMinutes: z.number().int().min(10).max(120).optional(),
});

// Adds a doctor to this hospital. Existing doctor accounts are linked (a doctor can sit at several
// hospitals); otherwise an account is created with a temporary password returned once.
router.post('/doctors', requireManager, requireHospital, validate(addDoctorSchema), async (req, res, next) => {
  try {
    const { email, name, phone, specialty, departmentId, ...practiceFields } = req.body;
    await assertDepartment(req.facility._id, departmentId);

    let user = await User.findOne({ email });
    let password;
    if (user && user.role !== 'doctor') throw new HttpError(409, 'This email belongs to a non-doctor account');
    if (!user) {
      if (!name || !specialty) throw new HttpError(400, 'Name and specialty are required for a new doctor');
      ({ user, password } = await createStaffAccount({ name, email, phone, role: 'doctor' }));
    }

    let doctor = await Doctor.findOne({ user: user._id });
    if (!doctor) {
      if (!specialty) throw new HttpError(400, 'This doctor has no profile yet; specialty is required');
      doctor = await Doctor.create({ user: user._id, specialty });
    }

    const existing = await Practice.findOne({ doctor: doctor._id, facility: req.facility._id });
    if (existing?.isActive) throw new HttpError(409, 'This doctor is already part of your hospital');

    const fields = {
      ...practiceFields,
      department: departmentId,
      availability: practiceFields.availability ?? DEFAULT_AVAILABILITY,
      location: req.facility.location,
      isActive: true,
    };
    const practice = existing
      ? await Object.assign(existing, fields).save()
      : await Practice.create({ ...fields, doctor: doctor._id, facility: req.facility._id });

    await practice.populate([
      { path: 'doctor', populate: { path: 'user', select: 'name email phone isActive' } },
      { path: 'department', select: 'name' },
    ]);
    res.status(201).json({ doctor: practice, tempPassword: password });
  } catch (err) {
    next(err);
  }
});

const updatePracticeSchema = z.object({
  departmentId: objectId.nullable().optional(),
  fee: z.number().min(0).optional(),
  availability: availabilitySchema.optional(),
  slotMinutes: z.number().int().min(10).max(120).optional(),
  isActive: z.boolean().optional(),
});

// Fee, department and timings. A clinic doctor uses this for their own schedule.
router.patch('/doctors/:id', requireManager, validate(updatePracticeSchema), async (req, res, next) => {
  try {
    const practice = await Practice.findOne({ _id: req.params.id, facility: req.facility._id });
    if (!practice) throw new HttpError(404, 'Doctor not found at this facility');

    const { departmentId, ...rest } = req.body;
    if (req.facility.type === 'clinic' && (departmentId !== undefined || rest.isActive === false)) {
      throw new HttpError(400, 'A clinic\'s own doctor cannot be moved or removed');
    }
    if (departmentId !== undefined) {
      await assertDepartment(req.facility._id, departmentId);
      practice.department = departmentId || undefined;
    }
    Object.assign(practice, rest);
    await practice.save();

    await practice.populate([
      { path: 'doctor', populate: { path: 'user', select: 'name email phone isActive' } },
      { path: 'department', select: 'name' },
    ]);
    res.json({ doctor: practice });
  } catch (err) {
    next(err);
  }
});

/* ---------- Reception staff (hospitals) ---------- */

router.get('/staff', requireManager, requireHospital, async (req, res, next) => {
  try {
    const staff = await User.find({ facility: req.facility._id, role: { $in: ['facility_admin', 'receptionist'] } })
      .select('name email phone role isActive mustChangePassword createdAt')
      .sort({ role: 1, createdAt: -1 });
    res.json({ staff });
  } catch (err) {
    next(err);
  }
});

const staffSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
});

router.post('/staff', requireManager, requireHospital, validate(staffSchema), async (req, res, next) => {
  try {
    if (await User.exists({ email: req.body.email })) throw new HttpError(409, 'Email already registered');
    const { user, password } = await createStaffAccount({ ...req.body, role: 'receptionist', facility: req.facility._id });
    res.status(201).json({ staff: user.toSafeJSON(), tempPassword: password });
  } catch (err) {
    next(err);
  }
});

router.patch('/staff/:id', requireManager, requireHospital, validate(z.object({ isActive: z.boolean() })), async (req, res, next) => {
  try {
    const staff = await User.findOneAndUpdate(
      { _id: req.params.id, facility: req.facility._id, role: 'receptionist' },
      { isActive: req.body.isActive },
      { new: true }
    );
    if (!staff) throw new HttpError(404, 'Receptionist not found');
    res.json({ staff: staff.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

/* ---------- Appointments ---------- */

// GET /api/facility/appointments?scope=upcoming|past|all&status=pending
router.get('/appointments', async (req, res, next) => {
  try {
    const filter = { facility: req.facility._id };
    const now = new Date();
    if (req.query.scope === 'upcoming') filter.startsAt = { $gte: now };
    if (req.query.scope === 'past') filter.startsAt = { $lt: now };
    if (['pending', 'confirmed', 'completed', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;

    const appointments = await Appointment.find(filter)
      .populate('patient', 'name phone')
      .populate({ path: 'doctor', select: 'specialty user', populate: { path: 'user', select: 'name' } })
      .populate('facility', 'name type')
      .populate({ path: 'practice', select: 'department', populate: { path: 'department', select: 'name' } })
      .sort({ startsAt: req.query.scope === 'past' ? -1 : 1 })
      .limit(300);
    res.json({ appointments: withActions(req.user, appointments) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
