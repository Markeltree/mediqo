const mongoose = require('mongoose');

// A browser's Web Push subscription (web panel)
const webPushSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true },
    keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
    userAgent: String,
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    // facility_admin runs a hospital, receptionist confirms its bookings, admin is the Mediqo platform team
    role: {
      type: String,
      enum: ['patient', 'doctor', 'facility_admin', 'receptionist', 'admin'],
      default: 'patient',
      index: true,
    },
    // The hospital a facility_admin or receptionist belongs to
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
    // Set when an account was created by someone else with a temporary password
    mustChangePassword: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    avatarUrl: String,
    // GeoJSON point for "near me" queries
    location: {
      // No default: a bare { type: 'Point' } without coordinates breaks the 2dsphere index
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
      address: String,
      updatedAt: Date,
    },
    webPushSubscriptions: [webPushSchema],
    notificationsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' }, { sparse: true });

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const { _id, name, email, phone, role, facility, mustChangePassword, avatarUrl, location, notificationsEnabled, createdAt } = this;
  return { id: _id, name, email, phone, role, facility, mustChangePassword, avatarUrl, location, notificationsEnabled, createdAt };
};

module.exports = mongoose.model('User', userSchema);
