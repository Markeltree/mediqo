const express = require('express');
const mongoose = require('mongoose');
const Practice = require('../models/Practice');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../middleware/error');
const { getAvailableSlots, localDateString, timezoneOf } = require('../utils/slots');
const { findNearbyPractices, findPractices } = require('../services/practices');

// A practice is "this doctor at this hospital/clinic": the thing a patient actually books
const router = express.Router();

// GET /api/practices/nearby?lat=&lng=&radiusKm=&specialty=&type=hospital|clinic
router.get('/nearby', requireAuth, async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat ?? req.user.location?.coordinates?.[1]);
    const lng = parseFloat(req.query.lng ?? req.user.location?.coordinates?.[0]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) throw new HttpError(400, 'lat and lng are required');

    const radiusKm = Math.min(parseFloat(req.query.radiusKm) || 25, 200);
    const facilityType = ['hospital', 'clinic'].includes(req.query.type) ? req.query.type : undefined;
    const practices = await findNearbyPractices({ lat, lng, radiusKm, specialty: req.query.specialty, facilityType });
    res.json({ practices });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Doctor not found');
    const [practice] = await findPractices({ _id: new mongoose.Types.ObjectId(req.params.id) }, { limit: 1 });
    if (!practice) throw new HttpError(404, 'Doctor not found');

    // Other places the same doctor sits, so patients can pick the most convenient one
    const others = await findPractices({ doctor: practice.doctorId, _id: { $ne: practice._id } });
    res.json({ practice, otherPractices: others });
  } catch (err) {
    next(err);
  }
});

// GET /api/practices/:id/slots?date=YYYY-MM-DD
router.get('/:id/slots', requireAuth, async (req, res, next) => {
  try {
    const practice = mongoose.isValidObjectId(req.params.id) ? await Practice.findById(req.params.id) : null;
    if (!practice || !practice.isActive) throw new HttpError(404, 'Doctor not found');
    const date = req.query.date || localDateString(new Date(), await timezoneOf(practice));
    const slots = await getAvailableSlots(practice, date);
    res.json({ date, slots });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
