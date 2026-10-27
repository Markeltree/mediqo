const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { z } = require('zod');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Facility = require('../models/Facility');
const Department = require('../models/Department');
const Practice = require('../models/Practice');
const { signToken, requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { HttpError } = require('../middleware/error');
const { findPractices } = require('../services/practices');
const { findListedFacilities } = require('../services/facilities');
const { facilityDetailsSchema, DEFAULT_AVAILABILITY } = require('../utils/schemas');

const router = express.Router();

const registerSchema = z
  .object({
    type: z.enum(['hospital', 'clinic']),
    account: z.object({
      name: z.string().min(2).max(80),
      email: z.string().email(),
      password: z.string().min(8).max(100),
      phone: z.string().max(20).optional(),
    }),
    facility: facilityDetailsSchema,
    // A clinic is run by its doctor, so their professional details are needed up front
    doctor: z
      .object({
        specialty: z.string().min(2),
        experienceYears: z.number().int().min(0).max(70).optional(),
        licenseNo: z.string().max(50).optional(),
        fee: z.number().min(0).optional(),
      })
      .optional(),
  })
  .refine((b) => b.type === 'hospital' || b.doctor, { message: 'Doctor details are required for a clinic', path: ['doctor'] });

// POST /api/facilities/register — a hospital admin or clinic doctor signs up; the facility waits for Mediqo approval
router.post('/register', validate(registerSchema), async (req, res, next) => {
  const created = [];
  try {
    const { type, account, facility: details, doctor: doctorDetails } = req.body;
    if (await User.exists({ email: account.email })) throw new HttpError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(account.password, 12);
    const user = await User.create({
      name: account.name, email: account.email, phone: account.phone, passwordHash,
      role: type === 'hospital' ? 'facility_admin' : 'doctor',
    });
    created.push(user);

    const { lat, lng, ...rest } = details;
    const facility = await Facility.create({
      ...rest, type, owner: user._id, location: { type: 'Point', coordinates: [lng, lat] },
    });
    created.push(facility);

    if (type === 'hospital') {
      user.facility = facility._id;
      await user.save();
    } else {
      const { fee, ...profile } = doctorDetails;
      const doctor = await Doctor.create({ ...profile, user: user._id });
      created.push(doctor);
      await Practice.create({
        doctor: doctor._id, facility: facility._id, fee: fee ?? 0,
        availability: DEFAULT_AVAILABILITY, location: facility.location,
      });
    }

    res.status(201).json({ token: signToken(user), user: user.toSafeJSON(), facility });
  } catch (err) {
    // No transactions on a standalone MongoDB, so undo the partial sign-up by hand
    await Promise.all(created.map((doc) => doc.deleteOne().catch(() => undefined)));
    next(err);
  }
});

// GET /api/facilities/nearby?lat=&lng=&radiusKm=&type=hospital|clinic — approved places that have bookable doctors
router.get('/nearby', requireAuth, async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat ?? req.user.location?.coordinates?.[1]);
    const lng = parseFloat(req.query.lng ?? req.user.location?.coordinates?.[0]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) throw new HttpError(400, 'lat and lng are required');

    const radiusKm = Math.min(parseFloat(req.query.radiusKm) || 25, 200);
    const type = ['hospital', 'clinic'].includes(req.query.type) ? req.query.type : undefined;
    const facilities = await findListedFacilities({ lat, lng, radiusKm, type });
    res.json({ facilities });
  } catch (err) {
    next(err);
  }
});

// GET /api/facilities/:id — a hospital or clinic with its departments and bookable doctors
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const facility = mongoose.isValidObjectId(req.params.id) ? await Facility.findById(req.params.id) : null;
    if (!facility || facility.status !== 'approved') throw new HttpError(404, 'Hospital or clinic not found');

    const [departments, doctors] = await Promise.all([
      Department.find({ facility: facility._id, isActive: true }).select('name description').sort({ name: 1 }),
      findPractices({ facility: facility._id }),
    ]);
    const { name, type, address, phone, location } = facility;
    res.json({ facility: { _id: facility._id, name, type, address, phone, location }, departments, doctors });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
