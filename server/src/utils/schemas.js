const { z } = require('zod');
const { toMinutes, isValidTimezone } = require('./slots');

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24h HH:MM');

const availabilitySchema = z
  .array(
    z
      .object({ day: z.number().int().min(0).max(6), start: hhmm, end: hhmm })
      .refine((s) => toMinutes(s.start) < toMinutes(s.end), 'start must be before end')
  )
  .max(28);

const facilityDetailsSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(20).optional(),
  address: z.string().min(3).max(200),
  licenseNo: z.string().max(50).optional(),
  timezone: z.string().refine(isValidTimezone, 'Unknown timezone').optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Mon–Fri 09:00–17:00 until the facility sets real timings
const DEFAULT_AVAILABILITY = [1, 2, 3, 4, 5].map((day) => ({ day, start: '09:00', end: '17:00' }));

module.exports = { availabilitySchema, facilityDetailsSchema, DEFAULT_AVAILABILITY };
