const mongoose = require('mongoose')

const checkpointSchema = new mongoose.Schema(
  {
    checkpointId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Checkpoint', checkpointSchema)
