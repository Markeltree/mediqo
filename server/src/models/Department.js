const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

departmentSchema.index({ facility: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
