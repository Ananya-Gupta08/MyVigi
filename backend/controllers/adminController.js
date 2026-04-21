const User = require('../models/User')
const Checkpoint = require('../models/Checkpoint')
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
      .select('username email role createdAt profilePhoto')
      .lean()

    const enhanced = await Promise.all(
      guards.map(async (guard) => {
        const lastLog = await PatrolLog.findOne({ guardId: guard._id })
          .sort('-timestamp')
          .lean()
        const totalLogs = await PatrolLog.countDocuments({ guardId: guard._id })
        const activeShift = await Shift.findOne({ guardId: guard._id, status: 'active' }).lean()
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

const getGuardDetails = async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  try {
    const guardId = req.params.id
    const guard = await User.findOne({ _id: guardId, role: 'guard' })
      .select('username email role createdAt profilePhoto')
      .lean()

    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }

    const route = await Checkpoint.find().sort('order').lean()
    const completedLogs = await PatrolLog.find({ guardId, status: 'completed' }).sort('checkpointOrder').lean()
    const activeShift = await Shift.findOne({ guardId, status: 'active' }).lean()

    const completedByOrder = new Map()
    completedLogs.forEach((log) => {
      completedByOrder.set(log.checkpointOrder, log)
    })

    const patrolRoute = route.map((checkpoint) => {
      const completed = completedByOrder.get(checkpoint.order)
      return {
        checkpointId: checkpoint.checkpointId,
        order: checkpoint.order,
        location: checkpoint.location,
        status: completed ? 'completed' : 'pending',
        completedAt: completed ? completed.timestamp : null,
      }
    })

    const completedCheckpoints = completedLogs.map((log) => ({
      checkpointId: log.checkpointId,
      order: log.checkpointOrder,
      completedAt: log.timestamp,
    }))

    res.json({
      message: 'Guard details retrieved',
      guard: {
        ...guard,
        patrolRoute,
        completedCheckpoints,
        activeShift,
        currentCheckpoint: completedCheckpoints.length
          ? completedCheckpoints[completedCheckpoints.length - 1].checkpointId
          : null,
      },
    })
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

module.exports = { getGuardsData, getGuardDetails, getPatrolUpdates }
