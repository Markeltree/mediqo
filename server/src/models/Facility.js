const mongoose = require('mongoose');

// A hospital (many doctors, receptionists confirm bookings) or a clinic (one doctor who confirms their own bookings)
const facilitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['hospital', 'clinic'], required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    licenseNo: { type: String, trim: true },
    // Doctors' timings ("09:00") are wall-clock times in this zone
    timezone: { type: String, default: 'Asia/Karachi' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    // facility_admin for a hospital, the doctor themselves for a clinic
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    rejectionReason: String,
  },
  { timestamps: true }
);

facilitySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Facility', facilitySchema);
