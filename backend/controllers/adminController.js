const User = require('../models/User')
const PatrolLog = require('../models/PatrolLog')
const Shift = require('../models/Shift')
const Request = require('../models/Request')

const requireAdmin = (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
}

const getGuardsData = async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  try {
    const guards = await User.find({ role: 'guard' })
      .select('username email role createdAt')
      .lean()

    const enhanced = await Promise.all(
      guards.map(async (guard) => {
        const lastLog = await PatrolLog.findOne({ guardId: guard._id })
          .sort('-timestamp')
          .lean()
        const totalLogs = await PatrolLog.countDocuments({ guardId: guard._id })
        const activeShift = await Shift.findOne({ userId: guard._id, status: 'active' }).lean()
        const lastRequest = await Request.findOne({ userId: guard._id })
          .sort('-requestDate')
          .lean()

        return {
          ...guard,
          lastPatrol: lastLog ? lastLog.timestamp : null,
          lastCheckpoint: lastLog ? lastLog.checkpointId : null,
          totalPatrols: totalLogs,
          activeShiftStart: activeShift ? activeShift.startTime : null,
          activeShiftStatus: activeShift ? activeShift.status : 'inactive',
          lastRequest: lastRequest
            ? {
                type: lastRequest.type,
                status: lastRequest.status,
                reason: lastRequest.reason,
                requestDate: lastRequest.requestDate,
                approvalNotes: lastRequest.approvalNotes || null,
              }
            : null,
        }
      })
    )

    res.json({ message: 'Guard data retrieved', guards: enhanced })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getPatrolUpdates = async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  try {
    const updates = await PatrolLog.find()
      .sort('-timestamp')
      .limit(50)
      .populate('guardId', 'username email')
      .lean()

    const formatted = updates.map((log) => ({
      id: log._id,
      guardId: log.guardId._id,
      guardName: log.guardId.username,
      checkpointId: log.checkpointId,
      timestamp: log.timestamp,
    }))

    res.json({ message: 'Patrol updates retrieved', updates: formatted })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getGuardsData, getPatrolUpdates }
