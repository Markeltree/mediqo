const Appointment = require('../models/Appointment');
const Facility = require('../models/Facility');

const DEFAULT_TIMEZONE = 'Asia/Karachi';

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes the zone is ahead of UTC at a given instant (e.g. +300 for Asia/Karachi). */
function tzOffsetMinutes(timeZone, date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
      .formatToParts(date)
      .map((p) => [p.type, Number(p.value)])
  );
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** The calendar date (YYYY-MM-DD) of an instant in a zone. */
function localDateString(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function isValidTimezone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

async function timezoneOf(practice) {
  if (practice.facility?.timezone) return practice.facility.timezone;
  const facility = await Facility.findById(practice.facility?._id ?? practice.facility).select('timezone');
  return facility?.timezone || DEFAULT_TIMEZONE;
}

/**
 * Builds bookable slots for a practice on a given date (YYYY-MM-DD in the facility's timezone).
 * Booked times are checked against the doctor across every facility, so a doctor who sits
 * at two places can never be double booked.
 */
async function getAvailableSlots(practice, dateStr) {
  const timeZone = await timezoneOf(practice);
  const utcMidnight = new Date(`${dateStr}T00:00:00.000Z`);
  const day = utcMidnight.getUTCDay();
  const windows = practice.availability.filter((a) => a.day === day);
  if (windows.length === 0) return [];

  // Offset taken at local noon so a DST switch at night does not shift the whole day
  const offset = tzOffsetMinutes(timeZone, new Date(utcMidnight.getTime() + 12 * 3600000));
  const dayStart = new Date(utcMidnight.getTime() - offset * 60000);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const booked = await Appointment.find({
    doctor: practice.doctor?._id ?? practice.doctor,
    startsAt: { $gte: dayStart, $lt: dayEnd },
    status: { $in: ['pending', 'confirmed'] },
  }).select('startsAt');
  const takenTimes = new Set(booked.map((a) => a.startsAt.getTime()));

  const slots = [];
  for (const w of windows) {
    for (let m = toMinutes(w.start); m + practice.slotMinutes <= toMinutes(w.end); m += practice.slotMinutes) {
      const startsAt = new Date(dayStart.getTime() + m * 60000);
      if (startsAt.getTime() < Date.now()) continue;
      slots.push({ startsAt, endsAt: new Date(startsAt.getTime() + practice.slotMinutes * 60000), available: !takenTimes.has(startsAt.getTime()) });
    }
  }
  return slots;
}

module.exports = { getAvailableSlots, toMinutes, timezoneOf, localDateString, isValidTimezone, DEFAULT_TIMEZONE };
