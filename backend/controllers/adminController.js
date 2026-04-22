const User = require('../models/User')
const Checkpoint = require('../models/Checkpoint')
const PatrolLog = require('../models/PatrolLog')
const Shift = require('../models/Shift')
const Request = require('../models/Request')

const ensureAdmin = (req, res) => {
  if (req.userRole !== 'admin') {
    res.status(403).json({ message: 'Admin access required' })
    return false
  }

  return true
}

const getGuardAssignedRoute = async (guard) => {
  const hasAssignedRoute = Array.isArray(guard.assignedCheckpointIds) && guard.assignedCheckpointIds.length > 0
  const query = hasAssignedRoute ? { checkpointId: { $in: guard.assignedCheckpointIds } } : {}
  return Checkpoint.find(query).sort('order').lean()
}

const buildGuardDetailsPayload = async (guardId) => {
  const guard = await User.findOne({ _id: guardId, role: 'guard' })
    .select('username email role createdAt profilePhoto assignedCheckpointIds')
    .lean()

  if (!guard) {
    return null
  }

  const route = await getGuardAssignedRoute(guard)
  const completedLogs = await PatrolLog.find({
    guardId,
    status: 'completed',
    checkpointId: { $in: route.map((checkpoint) => checkpoint.checkpointId) },
  })
    .sort({ timestamp: -1 })
    .lean()
  const activeShift = await Shift.findOne({ guardId, status: 'active' }).lean()

  const completedByOrder = new Map()
  completedLogs.forEach((log) => {
    const existing = completedByOrder.get(log.checkpointOrder)
    if (!existing || new Date(log.timestamp) > new Date(existing.timestamp)) {
      completedByOrder.set(log.checkpointOrder, log)
    }
  })

  const patrolRoute = route.map((checkpoint) => {
    const completed = completedByOrder.get(checkpoint.order)
    return {
      checkpointId: checkpoint.checkpointId,
      order: checkpoint.order,
      location: checkpoint.location,
      status: completed ? 'completed' : 'pending',
      completedAt: completed ? completed.timestamp : null,
      completedBy: completed ? guard.username : null,
    }
  })

  const completedCheckpoints = [...completedLogs]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map((log) => ({
      checkpointId: log.checkpointId,
      order: log.checkpointOrder,
      completedAt: log.timestamp,
      completedBy: guard.username,
    }))

  const currentRoute = patrolRoute.find((checkpoint) => checkpoint.status !== 'completed') || null

  return {
    ...guard,
    patrolRoute,
    completedCheckpoints,
    activeShift,
    currentCheckpoint: currentRoute ? currentRoute.checkpointId : null,
    currentRoute,
  }
}

const getGuardsData = async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return
  }

  try {
    const guards = await User.find({ role: 'guard' })
      .select('username email role createdAt profilePhoto assignedCheckpointIds')
      .lean()

    const enhanced = await Promise.all(
      guards.map(async (guard) => {
        const lastLog = await PatrolLog.findOne({ guardId: guard._id }).sort('-timestamp').lean()
        const totalLogs = await PatrolLog.countDocuments({ guardId: guard._id })
        const activeShift = await Shift.findOne({ guardId: guard._id, status: 'active' }).lean()
        const lastRequest = await Request.findOne({ userId: guard._id }).sort('-requestDate').lean()
        const route = await getGuardAssignedRoute(guard)
        const completedLogs = await PatrolLog.find({
          guardId: guard._id,
          status: 'completed',
          checkpointId: { $in: route.map((checkpoint) => checkpoint.checkpointId) },
        })
          .sort('checkpointOrder')
          .lean()
        const completedOrders = new Set(completedLogs.map((log) => log.checkpointOrder))
        const currentRoute = route.find((checkpoint) => !completedOrders.has(checkpoint.order)) || null

        return {
          ...guard,
          lastPatrol: lastLog ? lastLog.timestamp : null,
          lastCheckpoint: lastLog ? lastLog.checkpointId : null,
          totalPatrols: totalLogs,
          assignedRouteCount: route.length,
          currentRoute: currentRoute ? currentRoute.checkpointId : null,
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
  if (!ensureAdmin(req, res)) {
    return
  }

  try {
    const guard = await buildGuardDetailsPayload(req.params.id)

    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }

    res.json({
      message: 'Guard details retrieved',
      guard,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getPatrolUpdates = async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return
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

const getAvailableCheckpoints = async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return
  }

  try {
    const checkpoints = await Checkpoint.find().sort('order').lean()
    res.json({ message: 'Checkpoints retrieved', checkpoints })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const updateGuardRoute = async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return
  }

  try {
    const guardId = req.params.id
    const { assignedCheckpointIds } = req.body

    if (!Array.isArray(assignedCheckpointIds) || assignedCheckpointIds.length === 0) {
      return res.status(400).json({ message: 'Select at least one checkpoint for the guard route' })
    }

    const checkpoints = await Checkpoint.find({
      checkpointId: { $in: assignedCheckpointIds },
    })
      .sort('order')
      .lean()

    if (checkpoints.length !== assignedCheckpointIds.length) {
      return res.status(400).json({ message: 'One or more selected checkpoints are invalid' })
    }

    const orderedAssignedCheckpointIds = checkpoints.map((checkpoint) => checkpoint.checkpointId)

    const guard = await User.findOneAndUpdate(
      { _id: guardId, role: 'guard' },
      { assignedCheckpointIds: orderedAssignedCheckpointIds },
      { new: true }
    )
      .select('username email role createdAt profilePhoto assignedCheckpointIds')
      .lean()

    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }

    const io = req.app.get('io')
    if (io) {
      io.emit('guardRouteUpdated', {
        guardId,
        assignedCheckpointIds: orderedAssignedCheckpointIds,
      })
    }

    const details = await buildGuardDetailsPayload(guardId)

    res.json({
      message: 'Guard route assigned successfully',
      guard: details,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const resetGuardPatrolRoute = async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return
  }

  try {
    const guardId = req.params.id
    const guard = await User.findOne({ _id: guardId, role: 'guard' })
      .select('username assignedCheckpointIds')
      .lean()

    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }

    const route = await getGuardAssignedRoute(guard)
    const checkpointIds = route.map((checkpoint) => checkpoint.checkpointId)

    await PatrolLog.deleteMany({
      guardId,
      checkpointId: { $in: checkpointIds },
    })

    const io = req.app.get('io')
    if (io) {
      io.emit('guardRouteReset', {
        guardId,
        resetAt: new Date(),
      })
    }

    const details = await buildGuardDetailsPayload(guardId)

    res.json({
      message: 'Guard patrol route reset successfully',
      resetCheckpointIds: checkpointIds,
      guard: details,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = {
  getGuardsData,
  getGuardDetails,
  getPatrolUpdates,
  getAvailableCheckpoints,
  updateGuardRoute,
  resetGuardPatrolRoute,
}
