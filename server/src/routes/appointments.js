const express = require('express');
const { z } = require('zod');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Practice = require('../models/Practice');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { HttpError } = require('../middleware/error');
const { notifyUsers } = require('../services/push');
const { getAvailableSlots, localDateString, timezoneOf } = require('../utils/slots');
const { allowedActions, partiesOf, withActions } = require('../services/appointmentRules');

const router = express.Router();

const bookSchema = z.object({
  practiceId: z.string().length(24),
  startsAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

router.post('/', requireAuth, validate(bookSchema), async (req, res, next) => {
  try {
    if (req.user.role !== 'patient') throw new HttpError(403, 'Only patients can book appointments');
    const { practiceId, startsAt, reason } = req.body;

    const practice = await Practice.findById(practiceId)
      .populate('facility', 'name type status timezone')
      .populate({ path: 'doctor', select: 'user isVerified', populate: { path: 'user', select: 'name isActive' } });
    const listed = practice?.isActive && practice.facility?.status === 'approved'
      && practice.doctor?.isVerified && practice.doctor.user?.isActive;
    if (!listed) throw new HttpError(404, 'Doctor not available');

    const start = new Date(startsAt);
    if (start.getTime() < Date.now()) throw new HttpError(400, 'Cannot book in the past');
    const slots = await getAvailableSlots(practice, localDateString(start, await timezoneOf(practice)));
    const slot = slots.find((s) => s.startsAt.getTime() === start.getTime());
    if (!slot) throw new HttpError(400, 'That time is not one of the doctor\'s slots at this facility');
    if (!slot.available) throw new HttpError(409, 'This time slot was just taken');

    // The partial unique index guards against races; a duplicate key error becomes a 409 below
    const appt = await Appointment.create({
      patient: req.user._id, doctor: practice.doctor._id, practice: practice._id, facility: practice.facility._id,
      startsAt: start, endsAt: slot.endsAt, reason, fee: practice.fee, status: 'pending',
    }).catch((e) => {
      if (e.code === 11000) throw new HttpError(409, 'This time slot was just taken');
      throw e;
    });

    appt.facility = practice.facility;
    appt.doctor = practice.doctor;
    const recipients = (await partiesOf(appt)).filter((id) => id !== String(req.user._id));
    notifyUsers(recipients, {
      title: 'New appointment request',
      body: `${req.user.name} requested Dr. ${practice.doctor.user.name.replace(/^Dr\.?\s*/, '')} at ${practice.facility.name}, ${start.toLocaleString('en-US')}`,
      data: { type: 'appointment', appointmentId: appt.id },
    });

    res.status(201).json({ appointment: appt });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments?scope=upcoming|past — the signed-in patient's or doctor's own visits
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const now = new Date();
    const upcoming = req.query.scope !== 'past';
    const filter = upcoming ? { startsAt: { $gte: now } } : { startsAt: { $lt: now } };

    if (req.user.role === 'doctor') {
      const doc = await Doctor.findOne({ user: req.user._id });
      if (!doc) return res.json({ appointments: [] });
      filter.doctor = doc._id;
    } else {
      filter.patient = req.user._id;
    }

    const appointments = await Appointment.find(filter)
      .populate('patient', 'name phone')
      .populate({ path: 'doctor', select: 'specialty user', populate: { path: 'user', select: 'name' } })
      .populate('facility', 'name type address location currency')
      .populate({ path: 'practice', select: 'department', populate: { path: 'department', select: 'name' } })
      .sort({ startsAt: upcoming ? 1 : -1 })
      .limit(100);
    res.json({ appointments: withActions(req.user, appointments) });
  } catch (err) {
    next(err);
  }
});

const STATUS_FOR_ACTION = { confirm: 'confirmed', complete: 'completed', cancel: 'cancelled' };
const statusSchema = z.object({ status: z.enum(['confirmed', 'completed', 'cancelled']) });

router.patch('/:id/status', requireAuth, validate(statusSchema), async (req, res, next) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate('facility', 'name type')
      .populate({ path: 'doctor', select: 'user', populate: { path: 'user', select: 'name' } });
    if (!appt) throw new HttpError(404, 'Appointment not found');

    const { status } = req.body;
    const { who, actions } = allowedActions(req.user, appt);
    if (!who) throw new HttpError(403, 'Not allowed');
    const allowed = actions.some((a) => STATUS_FOR_ACTION[a] === status);
    if (!allowed) {
      const confirmer = appt.facility?.type === 'clinic' ? 'the doctor' : 'the hospital reception';
      const msg = status === 'confirmed' && appt.status === 'pending'
        ? `Only ${confirmer} can confirm this appointment`
        : `Cannot mark a ${appt.status} appointment as ${status}`;
      throw new HttpError(403, msg);
    }

    appt.status = status;
    if (status === 'confirmed') appt.confirmedBy = req.user._id;
    if (status === 'cancelled') appt.cancelledBy = who;
    await appt.save();

    const recipients = (await partiesOf(appt)).filter((id) => id !== String(req.user._id));
    const when = appt.startsAt.toLocaleString('en-US');
    notifyUsers(recipients, {
      title: `Appointment ${status}`,
      body: `${appt.doctor.user.name} at ${appt.facility.name}, ${when} is now ${status}.`,
      data: { type: 'appointment', appointmentId: appt.id },
    });

    res.json({ appointment: appt });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
