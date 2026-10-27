const Facility = require('../models/Facility');

/**
 * Approved hospitals/clinics that have at least one bookable (verified) doctor.
 * With lat/lng results are nearest first and carry distanceKm; radiusKm limits them, if given.
 * `search` is a RegExp matched against name, address and department names.
 */
async function findListedFacilities({ lat, lng, radiusKm, type, search, limit = 50 }) {
  const query = { status: 'approved' };
  if (type) query.type = type;

  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const first = hasPoint
    ? {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        ...(radiusKm ? { maxDistance: radiusKm * 1000 } : {}),
        spherical: true,
        query,
      },
    }
    : { $match: query };

  const facilities = await Facility.aggregate([
    first,
    {
      $lookup: {
        from: 'practices',
        let: { f: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$facility', '$$f'] }, isActive: true } },
          { $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'd' } },
          { $match: { 'd.isVerified': true } },
          { $count: 'n' },
        ],
        as: 'doctorCount',
      },
    },
    { $addFields: { doctorsCount: { $ifNull: [{ $arrayElemAt: ['$doctorCount.n', 0] }, 0] } } },
    { $match: { doctorsCount: { $gt: 0 } } },
    {
      $lookup: {
        from: 'departments',
        let: { f: '$_id' },
        pipeline: [{ $match: { $expr: { $eq: ['$facility', '$$f'] }, isActive: true } }, { $project: { name: 1 } }],
        as: 'departments',
      },
    },
    ...(search ? [{ $match: { $or: [{ name: search }, { address: search }, { 'departments.name': search }] } }] : []),
    ...(hasPoint ? [] : [{ $sort: { name: 1 } }]),
    { $limit: limit },
    { $project: { name: 1, type: 1, address: 1, phone: 1, location: 1, distanceMeters: 1, doctorsCount: 1, departments: 1 } },
  ]);

  return facilities.map(({ distanceMeters, ...f }) =>
    distanceMeters === undefined ? f : { ...f, distanceKm: +(distanceMeters / 1000).toFixed(1) }
  );
}

module.exports = { findListedFacilities };
