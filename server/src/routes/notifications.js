const express = require('express');
const { z } = require('zod');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { WEB_PUSH_ENABLED } = require('../services/push');

const router = express.Router();

/* ---------- Browser push (web panel) ---------- */

router.get('/web-push/key', (_req, res) => {
  res.json({ enabled: WEB_PUSH_ENABLED, publicKey: WEB_PUSH_ENABLED ? process.env.VAPID_PUBLIC_KEY : null });
});

const subscriptionSchema = z.object({
  // https only: the server POSTs to this URL, so it must be a real push service, not an internal address
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith('https://'), 'Push endpoint must be https'),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

router.post('/web-push', requireAuth, validate(subscriptionSchema), async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    // A browser belongs to one signed-in user at a time
    await User.updateMany({ 'webPushSubscriptions.endpoint': endpoint }, { $pull: { webPushSubscriptions: { endpoint } } });
    await User.updateOne(
      { _id: req.user._id },
      { $push: { webPushSubscriptions: { $each: [{ endpoint, keys, userAgent: req.get('user-agent')?.slice(0, 200) }], $slice: -10 } } }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/web-push', requireAuth, validate(z.object({ endpoint: z.string().max(1000) })), async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $pull: { webPushSubscriptions: { endpoint: req.body.endpoint } } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ---------- In-app notifications ---------- */

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    const unread = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ notifications: items, unread });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
