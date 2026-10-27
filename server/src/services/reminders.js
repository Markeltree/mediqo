const Appointment = require('../models/Appointment');
const { notifyUsers } = require('./push');

const LEAD_MINUTES = Number(process.env.REMINDER_LEAD_MINUTES) || 60;
const CHECK_EVERY_MS = 5 * 60 * 1000;

/** Sends a "starts soon" reminder to the patient and doctor of each confirmed visit inside the lead window. */
async function sendDueReminders() {
  const now = new Date();
  const due = await Appointment.find({
    status: 'confirmed',
    startsAt: { $gt: now, $lte: new Date(now.getTime() + LEAD_MINUTES * 60 * 1000) },
    reminderSentAt: null,
  })
    .populate('patient', 'name')
    .populate('facility', 'name')
    .populate({ path: 'doctor', select: 'user', populate: { path: 'user', select: 'name' } })
    .limit(200);

  const sends = [];
  for (const appt of due) {
    // Claim first so overlapping runs (cron retries, a second instance) cannot send the same reminder
    const { modifiedCount } = await Appointment.updateOne({ _id: appt._id, reminderSentAt: null }, { reminderSentAt: now });
    if (!modifiedCount) continue;

    const mins = Math.max(1, Math.round((appt.startsAt - now) / 60000));
    const data = { type: 'appointment', appointmentId: appt.id };
    sends.push(
      notifyUsers([appt.patient?._id], {
        title: 'Your visit starts soon',
        body: `${appt.doctor?.user?.name ?? 'Your doctor'} at ${appt.facility?.name ?? 'the clinic'} in ${mins} min. Please arrive a little early.`,
        data,
      }),
      notifyUsers([appt.doctor?.user?._id], {
        title: 'Upcoming visit',
        body: `${appt.patient?.name ?? 'A patient'} at ${appt.facility?.name ?? 'your clinic'} in ${mins} min.`,
        data,
      })
    );
  }
  await Promise.all(sends);
  return sends.length / 2;
}

/** Local/long-running servers only. On Vercel, a cron job calls GET /api/cron/reminders instead. */
function startReminderJob() {
  const run = () => sendDueReminders().catch((err) => console.error('Reminder job failed', err.message));
  run();
  return setInterval(run, CHECK_EVERY_MS);
}

module.exports = { startReminderJob, sendDueReminders };
