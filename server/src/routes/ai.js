const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { findNearbyPractices, findPractices } = require('../services/practices');
const ai = require('../services/ai');

const router = express.Router();

const SPECIALTIES = [
  'General Practice', 'Dentist', 'Dermatology', 'Cardiology', 'Gynecology', 'Pediatrics',
  'Orthopedics', 'Neurology', 'Psychiatry', 'Ophthalmology', 'ENT', 'Physiotherapy', 'Pharmacy',
];

router.get('/status', requireAuth, (_req, res) => res.json({ configured: ai.isConfigured() }));

const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20),
});

router.post('/chat', requireAuth, validate(chatSchema), async (req, res, next) => {
  try {
    const reply = await ai.chat(req.body.messages);
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

const triageSchema = z.object({
  symptoms: z.string().min(5).max(2000),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

// Symptom triage: returns a suggested specialty and nearby verified doctors for it
router.post('/triage', requireAuth, validate(triageSchema), async (req, res, next) => {
  try {
    const suggestion = await ai.suggestSpecialty(req.body.symptoms, SPECIALTIES);

    const lat = req.body.lat ?? req.user.location?.coordinates?.[1];
    const lng = req.body.lng ?? req.user.location?.coordinates?.[0];
    const specialty = suggestion.specialty;
    const doctors = lat !== undefined && lng !== undefined
      ? await findNearbyPractices({ lat, lng, radiusKm: 50, specialty, limit: 5 })
      : await findPractices({}, { specialty, limit: 5 });

    res.json({ suggestion, doctors });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
