const Practice = require('../models/Practice');

// Only practices whose facility is approved and whose doctor is verified are shown to patients
const LISTED = [
  { $lookup: { from: 'facilities', localField: 'facility', foreignField: '_id', as: 'facility' } },
  { $unwind: '$facility' },
  { $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'doctor' } },
  { $unwind: '$doctor' },
  { $match: { 'facility.status': 'approved', 'doctor.isVerified': true } },
];

const PUBLIC_JOIN = [
  { $lookup: { from: 'users', localField: 'doctor.user', foreignField: '_id', as: 'user' } },
  { $unwind: '$user' },
  { $match: { 'user.isActive': true } },
  { $lookup: { from: 'departments', localField: 'department', foreignField: '_id', as: 'department' } },
  { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
];

const PUBLIC_PROJECT = [
  {
    $project: {
      fee: 1, slotMinutes: 1, location: 1, distanceMeters: 1,
      doctorId: '$doctor._id',
      name: '$user.name', avatarUrl: '$user.avatarUrl',
      specialty: '$doctor.specialty', bio: '$doctor.bio', experienceYears: '$doctor.experienceYears',
      rating: '$doctor.rating', reviewsCount: '$doctor.reviewsCount',
      facility: {
        _id: '$facility._id', name: '$facility.name', type: '$facility.type', address: '$facility.address', phone: '$facility.phone',
        currency: { $ifNull: ['$facility.currency', 'PKR'] }, // facilities created before currencies existed
      },
      department: { _id: '$department._id', name: '$department.name' },
    },
  },
];

const PUBLIC_SHAPE = [...PUBLIC_JOIN, ...PUBLIC_PROJECT];

const withDistance = (p) => (p.distanceMeters === undefined ? p : { ...p, distanceKm: +(p.distanceMeters / 1000).toFixed(1) });

/** Bookable doctor-at-facility entries near a point, nearest first. */
async function findNearbyPractices({ lat, lng, radiusKm = 25, specialty, facilityType, limit = 50 }) {
  const match = { isActive: true };
  const after = {};
  if (specialty) after['doctor.specialty'] = specialty;
  if (facilityType) after['facility.type'] = facilityType;

  const rows = await Practice.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: match,
      },
    },
    ...LISTED,
    { $match: after },
    { $limit: limit },
    ...PUBLIC_SHAPE,
  ]);
  return rows.map(withDistance);
}

/** Listed practices matching a filter on Practice fields (e.g. one facility), without distance. */
async function findPractices(filter, { specialty, limit = 100 } = {}) {
  const after = specialty ? { 'doctor.specialty': specialty } : {};
  return Practice.aggregate([
    { $match: { isActive: true, ...filter } },
    ...LISTED,
    { $match: after },
    { $limit: limit },
    ...PUBLIC_SHAPE,
  ]);
}

/**
 * Listed practices anywhere whose doctor name, specialty, department or facility name matches `search` (a RegExp).
 * Nearest first when lat/lng are given.
 */
async function searchPractices({ search, lat, lng, limit = 30 }) {
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const first = hasPoint
    ? { $geoNear: { near: { type: 'Point', coordinates: [lng, lat] }, distanceField: 'distanceMeters', spherical: true, query: { isActive: true } } }
    : { $match: { isActive: true } };

  const rows = await Practice.aggregate([
    first,
    ...LISTED,
    ...PUBLIC_JOIN,
    {
      $match: {
        $or: [{ 'user.name': search }, { 'doctor.specialty': search }, { 'department.name': search }, { 'facility.name': search }],
      },
    },
    ...(hasPoint ? [] : [{ $sort: { 'user.name': 1 } }]),
    { $limit: limit },
    ...PUBLIC_PROJECT,
  ]);
  return rows.map(withDistance);
}

module.exports = { findNearbyPractices, findPractices, searchPractices };
