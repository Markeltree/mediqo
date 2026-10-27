const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../middleware/error');
const { searchPractices } = require('../services/practices');
const { findListedFacilities } = require('../services/facilities');

const router = express.Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/search?q=&lat=&lng= — doctors and hospitals/clinics anywhere, by name, specialty or department.
// Unlike /nearby there is no radius: a patient may book for a relative in another city. Nearest first when a point is known.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2 || q.length > 60) throw new HttpError(400, 'Search must be 2–60 characters');

    let lat = parseFloat(req.query.lat ?? req.user.location?.coordinates?.[1]);
    let lng = parseFloat(req.query.lng ?? req.user.location?.coordinates?.[0]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) lat = lng = undefined;

    const search = new RegExp(escapeRegex(q), 'i');
    const [practices, facilities] = await Promise.all([
      searchPractices({ search, lat, lng }),
      findListedFacilities({ lat, lng, search, limit: 20 }),
    ]);
    res.json({ practices, facilities });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
