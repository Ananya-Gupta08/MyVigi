const mongoose = require('mongoose')

const patrolLogSchema = new mongoose.Schema(
  {
    guardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    checkpointId: {
      type: String,
      required: true,
      trim: true,
    },
    checkpointOrder: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['completed', 'locked', 'pending'],
      default: 'completed',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('PatrolLog', patrolLogSchema)
