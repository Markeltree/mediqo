const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  { day: { type: Number, min: 0, max: 6 }, start: String, end: String }, // "09:00" - "17:00", day 0 = Sunday
  { _id: false }
);

// One doctor sitting at one facility: their fee, department and timings there. Patients book a practice.
const practiceSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    fee: { type: Number, default: 0, min: 0 },
    availability: [slotSchema],
    slotMinutes: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
    // Copied from the facility so proximity search is a single $geoNear; kept in sync on facility updates
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
  },
  { timestamps: true }
);

practiceSchema.index({ doctor: 1, facility: 1 }, { unique: true });
practiceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Practice', practiceSchema);
