const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/error');
const { sendDueReminders } = require('./services/reminders');

const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctors');
const practiceRoutes = require('./routes/practices');
const facilityRoutes = require('./routes/facilities');
const facilityAdminRoutes = require('./routes/facilityAdmin');
const appointmentRoutes = require('./routes/appointments');
const notificationRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');
const searchRoutes = require('./routes/search');

const app = express();

// Behind Vercel's (or any) proxy, so rate limiting sees the real client IP
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', authLimiter);
app.use('/api/facilities/register', authLimiter);

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'mediqo', time: new Date() }));

// Serverless instances start cold, so every request makes sure the (cached) connection is up
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Called every few minutes by a scheduler (see README: Deploy). Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
app.get('/api/cron/reminders', async (req, res, next) => {
  try {
    if (!process.env.CRON_SECRET || req.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ ok: true, reminded: await sendDueReminders() });
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/practices', practiceRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/facility', facilityAdminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
