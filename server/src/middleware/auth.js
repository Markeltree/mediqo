const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { HttpError } = require('./error');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Missing bearer token');

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user || !user.isActive) throw new HttpError(401, 'Account not found or disabled');

    req.user = user;
    next();
  } catch (err) {
    next(err.status ? err : new HttpError(401, 'Invalid or expired token'));
  }
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Insufficient permissions'));
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
