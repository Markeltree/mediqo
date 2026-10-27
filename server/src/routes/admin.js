const express = require('express');
const { z } = require('zod');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Facility = require('../models/Facility');
const Practice = require('../models/Practice');
const Appointment = require('../models/Appointment');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { HttpError } = require('../middleware/error');
const { notifyUsers } = require('../services/push');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/stats', async (_req, res, next) => {
  try {
    const [patients, doctors, verifiedDoctors, hospitals, clinics, pendingFacilities, upcoming, total] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      Doctor.countDocuments(),
      Doctor.countDocuments({ isVerified: true }),
      Facility.countDocuments({ type: 'hospital', status: 'approved' }),
      Facility.countDocuments({ type: 'clinic', status: 'approved' }),
      Facility.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ startsAt: { $gte: new Date() }, status: { $in: ['pending', 'confirmed'] } }),
      Appointment.countDocuments(),
    ]);
    const byStatus = await Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.json({
      patients, doctors, verifiedDoctors, hospitals, clinics, pendingFacilities,
      upcomingAppointments: upcoming, totalAppointments: total, byStatus,
    });
  } catch (err) {
    next(err);
  }
});

/* ---------- Hospitals & clinics ---------- */

router.get('/facilities', async (req, res, next) => {
  try {
    const filter = {};
    if (['pending', 'approved', 'rejected'].includes(req.query.status)) filter.status = req.query.status;
    if (['hospital', 'clinic'].includes(req.query.type)) filter.type = req.query.type;
    const facilities = await Facility.find(filter).populate('owner', 'name email phone').sort({ createdAt: -1 }).lean();

    const counts = await Practice.aggregate([
      { $match: { facility: { $in: facilities.map((f) => f._id) }, isActive: true } },
      { $group: { _id: '$facility', n: { $sum: 1 } } },
    ]);
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    res.json({ facilities: facilities.map((f) => ({ ...f, doctorsCount: byId[String(f._id)] || 0 })) });
  } catch (err) {
    next(err);
  }
});

const facilityStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reason: z.string().max(300).optional(),
});

router.patch('/facilities/:id/status', validate(facilityStatusSchema), async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      { status, rejectionReason: status === 'rejected' ? reason : undefined },
      { new: true }
    );
    if (!facility) throw new HttpError(404, 'Hospital or clinic not found');

    notifyUsers([facility.owner], {
      title: status === 'approved' ? `${facility.name} is live on Mediqo` : `${facility.name} needs changes`,
      body: status === 'approved' ? 'Patients can now find and book you.' : reason || 'Please review your details and resubmit.',
      data: { type: 'facility', facilityId: facility.id },
    });
    res.json({ facility });
  } catch (err) {
    next(err);
  }
});

/* ---------- Doctors (credential verification, applies at every facility) ---------- */

router.get('/doctors', async (req, res, next) => {
  try {
    const filter = req.query.verified === 'false' ? { isVerified: false } : {};
    const doctors = await Doctor.find(filter).populate('user', 'name email phone isActive').sort({ createdAt: -1 }).lean();
    const practices = await Practice.find({ doctor: { $in: doctors.map((d) => d._id) }, isActive: true })
      .populate('facility', 'name type status currency')
      .select('doctor facility fee')
      .lean();
    const byDoctor = {};
    for (const p of practices) (byDoctor[String(p.doctor)] ||= []).push({ facility: p.facility, fee: p.fee });
    res.json({ doctors: doctors.map((d) => ({ ...d, practices: byDoctor[String(d._id)] || [] })) });
  } catch (err) {
    next(err);
  }
});

router.patch('/doctors/:id/verify', async (req, res, next) => {
  try {
    const doc = await Doctor.findByIdAndUpdate(req.params.id, { isVerified: !!req.body.isVerified }, { new: true });
    if (!doc) throw new HttpError(404, 'Doctor not found');
    res.json({ doctor: doc });
  } catch (err) {
    next(err);
  }
});

/* ---------- Users & appointments ---------- */

router.get('/users', async (req, res, next) => {
  try {
    const filter = req.query.role ? { role: req.query.role } : {};
    const users = await User.find(filter)
      .select('name email role facility isActive createdAt')
      .populate('facility', 'name')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/active', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: !!req.body.isActive }, { new: true });
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

router.get('/appointments', async (_req, res, next) => {
  try {
    const appointments = await Appointment.find()
      .populate('patient', 'name')
      .populate({ path: 'doctor', select: 'specialty user', populate: { path: 'user', select: 'name' } })
      .populate('facility', 'name type currency')
      .sort({ startsAt: -1 })
      .limit(200);
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
