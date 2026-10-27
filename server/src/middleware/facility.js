const Facility = require('../models/Facility');
const { HttpError } = require('./error');

/**
 * Loads the facility the signed-in user works for into req.facility:
 * hospital staff via user.facility, a clinic doctor via the clinic they own.
 * req.canManage is true for the hospital admin and the clinic's own doctor; receptionists are read-mostly.
 */
async function loadMyFacility(req, _res, next) {
  try {
    const { role } = req.user;
    let facility = null;
    if (role === 'facility_admin' || role === 'receptionist') {
      facility = req.user.facility ? await Facility.findById(req.user.facility) : null;
    } else if (role === 'doctor') {
      facility = await Facility.findOne({ owner: req.user._id, type: 'clinic' });
    }
    if (!facility) throw new HttpError(404, 'No hospital or clinic is linked to this account');

    req.facility = facility;
    req.canManage = role === 'facility_admin' || role === 'doctor';
    next();
  } catch (err) {
    next(err);
  }
}

function requireManager(req, _res, next) {
  if (!req.canManage) return next(new HttpError(403, 'Only the hospital admin can do this'));
  next();
}

function requireHospital(req, _res, next) {
  if (req.facility.type !== 'hospital') return next(new HttpError(400, 'Clinics have a single doctor; this is only for hospitals'));
  next();
}

module.exports = { loadMyFacility, requireManager, requireHospital };
