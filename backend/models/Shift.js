const mongoose = require('mongoose')

const shiftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    qrCode: {
      type: String,
      required: false,
    },
    location: {
      latitude: {
        type: Number,
        required: false,
      },
      longitude: {
        type: Number,
        required: false,
      },
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    durationHours: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Shift', shiftSchema)
