const webpush = require('web-push');
const { waitUntil } = require('@vercel/functions');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Browser push for the web panel; generate keys with `npx web-push generate-vapid-keys`
const WEB_PUSH_ENABLED = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (WEB_PUSH_ENABLED) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@mediqo.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/** The web panel page a notification opens when clicked. */
function panelUrl(role, data = {}) {
  if (data.type === 'appointment') return role === 'admin' ? '/appointments' : '/facility/appointments';
  if (data.type === 'facility') return role === 'admin' ? '/facilities' : '/facility';
  return role === 'admin' ? '/dashboard' : '/facility';
}

async function sendWeb(user, { title, body, data }) {
  if (!WEB_PUSH_ENABLED || !user.webPushSubscriptions?.length) return;
  const payload = JSON.stringify({ title, body, url: panelUrl(user.role, data), tag: data.appointmentId || data.facilityId });

  const gone = [];
  await Promise.all(
    user.webPushSubscriptions.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 60 * 60 * 24, urgency: 'high' }).catch((err) => {
        // 404/410: the browser unsubscribed or the subscription expired
        if (err.statusCode === 404 || err.statusCode === 410) gone.push(sub.endpoint);
        else console.error('Web push failed', err.statusCode, err.body || err.message);
      })
    )
  );

  if (gone.length) {
    await User.updateOne({ _id: user._id }, { $pull: { webPushSubscriptions: { endpoint: { $in: gone } } } });
  }
}

/**
 * Stores an in-app notification (inbox in the app, bell in the panel) and pushes it to the user's browsers.
 */
async function notifyUser(userId, { title, body, data = {} }) {
  await Notification.create({ user: userId, title, body, data });

  const user = await User.findById(userId).select('role webPushSubscriptions notificationsEnabled');
  if (!user || !user.notificationsEnabled) return;

  await sendWeb(user, { title, body, data });
}

/**
 * Notifies several users without delaying the response; failures are logged, never thrown into the request.
 * On Vercel, waitUntil keeps the function alive until this finishes; elsewhere it simply runs in the background.
 */
function notifyUsers(userIds, payload) {
  const unique = [...new Set(userIds.filter(Boolean).map(String))];
  const work = Promise.all(
    unique.map((id) => notifyUser(id, payload).catch((err) => console.error('Notify failed', err.message)))
  );
  waitUntil(work);
  return work;
}

module.exports = { notifyUser, notifyUsers, WEB_PUSH_ENABLED };
