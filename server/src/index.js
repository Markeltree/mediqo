require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const { startReminderJob } = require('./services/reminders');

const PORT = process.env.PORT || 4000;

// Long-running server (local dev, a VPS, Render…). On Vercel, api/index.js serves the same app.
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Mediqo API running on http://localhost:${PORT}`));
  startReminderJob();
});
