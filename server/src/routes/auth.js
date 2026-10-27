const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const User = require('../models/User');
const { signToken, requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { HttpError } = require('../middleware/error');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  phone: z.string().max(20).optional(),
  role: z.enum(['patient', 'doctor']).default('patient'),
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (await User.exists({ email })) throw new HttpError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, phone, role });
    res.status(201).json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok || !user.isActive) throw new HttpError(401, 'Invalid email or password');

    res.json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toSafeJSON() }));

const locationSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  address: z.string().max(200).optional(),
});

router.put('/location', requireAuth, validate(locationSchema), async (req, res, next) => {
  try {
    const { lng, lat, address } = req.body;
    req.user.location = { type: 'Point', coordinates: [lng, lat], address, updatedAt: new Date() };
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

// Also how staff and doctors replace the temporary password a hospital admin gave them
router.post('/change-password', requireAuth, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
      throw new HttpError(400, 'Current password is incorrect');
    }
    user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    user.mustChangePassword = false;
    await user.save();
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'notificationsEnabled'];
    for (const key of allowed) if (req.body[key] !== undefined) req.user[key] = req.body[key];
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
