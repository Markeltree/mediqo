const express = require('express');
const { z } = require('zod');
const Doctor = require('../models/Doctor');
const Practice = require('../models/Practice');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.get('/specialties', async (_req, res, next) => {
  try {
    const list = await Doctor.distinct('specialty', { isVerified: true });
    res.json({ specialties: list.sort() });
  } catch (err) {
    next(err);
  }
});

// The signed-in doctor's profile and every facility they sit at
router.get('/me', requireAuth, requireRole('doctor'), async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    const practices = doctor
      ? await Practice.find({ doctor: doctor._id })
        .populate('facility', 'name type address status')
        .populate('department', 'name')
      : [];
    res.json({ doctor, practices });
  } catch (err) {
    next(err);
  }
});

const doctorProfileSchema = z.object({
  specialty: z.string().min(2),
  bio: z.string().max(1000).optional(),
  experienceYears: z.number().int().min(0).max(70).optional(),
  licenseNo: z.string().max(50).optional(),
});

// Doctors create/update their own professional profile. Fee and timings are set per facility.
router.put('/me/profile', requireAuth, requireRole('doctor'), validate(doctorProfileSchema), async (req, res, next) => {
  try {
    const doc = await Doctor.findOneAndUpdate(
      { user: req.user._id },
      { ...req.body, user: req.user._id },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ doctor: doc });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
