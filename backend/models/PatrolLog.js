const mongoose = require("mongoose");

const patrolSchema = new mongoose.Schema({
  guardId: String,
  locationId: String,
  status: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PatrolLog", patrolSchema);