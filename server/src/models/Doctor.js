const mongoose = require('mongoose');

// The doctor's professional profile. Where they sit, their fee and timings live on Practice (one per facility).
const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialty: { type: String, required: true, index: true },
    bio: String,
    experienceYears: { type: Number, default: 0 },
    licenseNo: { type: String, trim: true }, // PMDC / medical council registration
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    // Platform admin checks credentials once; applies at every facility
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

doctorSchema.index({ specialty: 1, isVerified: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
