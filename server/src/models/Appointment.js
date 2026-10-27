const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    practice: { type: mongoose.Schema.Types.ObjectId, ref: 'Practice', required: true },
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reason: { type: String, maxlength: 500 },
    fee: Number,
    cancelledBy: { type: String, enum: ['patient', 'doctor', 'staff', 'admin', null], default: null },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, maxlength: 1000 },
    // Set once the "visit starts soon" push has gone out, so it is sent only once
    reminderSentAt: Date,
  },
  { timestamps: true }
);

// Prevent double booking for the same doctor and slot (ignoring cancelled rows)
appointmentSchema.index(
  { doctor: 1, startsAt: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
