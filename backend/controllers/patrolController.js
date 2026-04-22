const Checkpoint = require('../models/Checkpoint')
const PatrolLog = require('../models/PatrolLog')
const User = require('../models/User')

const getAssignedRoute = async (guardId) => {
  const guard = await User.findById(guardId).select('username assignedCheckpointIds').lean()
  if (!guard) {
    return { guard: null, checkpoints: [] }
  }

  const hasAssignedRoute = Array.isArray(guard.assignedCheckpointIds) && guard.assignedCheckpointIds.length > 0
  const query = hasAssignedRoute ? { checkpointId: { $in: guard.assignedCheckpointIds } } : {}
  const checkpoints = await Checkpoint.find(query).sort('order').lean()

  return { guard, checkpoints }
}

const scanCheckpoint = async (req, res) => {
  const { checkpointId, scannedValue } = req.body
  const guardId = req.userId

  if (!checkpointId) {
    return res.status(400).json({ message: 'checkpointId is required' })
  }

  try {
    const { guard, checkpoints: assignedRoute } = await getAssignedRoute(guardId)
    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }

    const checkpoint = assignedRoute.find((item) => item.checkpointId === checkpointId)
    if (!checkpoint) {
      return res.status(400).json({ message: 'Checkpoint is not assigned to this guard' })
    }

    const normalizedScannedValue = String(scannedValue || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
    const acceptedValues = [
      checkpoint.checkpointId,
      `p${checkpoint.order}`,
      `checkpoint${checkpoint.order}`,
    ].map((value) => String(value).trim().toLowerCase().replace(/\s+/g, ''))

    if (normalizedScannedValue && !acceptedValues.includes(normalizedScannedValue)) {
      return res.status(400).json({
        message: `Scanned QR does not match checkpoint ${checkpoint.checkpointId}`,
        expectedValues: acceptedValues,
      })
    }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    const duplicate = await PatrolLog.findOne({
      guardId,
      checkpointId,
      timestamp: { $gte: thirtyMinutesAgo },
    })

    if (duplicate) {
      return res.status(400).json({ message: 'Checkpoint already scanned within 30 minutes' })
    }

    const completedOrders = new Set(
      (
        await PatrolLog.find({
          guardId,
          checkpointId: { $in: assignedRoute.map((item) => item.checkpointId) },
          status: 'completed',
        })
          .select('checkpointOrder')
          .lean()
      ).map((log) => log.checkpointOrder)
    )

    const nextPendingCheckpoint = assignedRoute.find((item) => !completedOrders.has(item.order))
    if (!nextPendingCheckpoint) {
      return res.status(400).json({ message: 'Assigned patrol route is already completed' })
    }

    if (checkpoint.order !== nextPendingCheckpoint.order) {
      return res.status(400).json({
        message: `Checkpoint sequence locked. Expected ${nextPendingCheckpoint.checkpointId}`,
        currentOrder: checkpoint.order,
        expectedOrder: nextPendingCheckpoint.order,
        expectedCheckpointId: nextPendingCheckpoint.checkpointId,
      })
    }

    const patrolLog = new PatrolLog({
      guardId,
      checkpointId,
      checkpointOrder: checkpoint.order,
      status: 'completed',
    })
    await patrolLog.save()

    // Emit real-time update
    const io = req.app.get('io')
    if (io) {
      io.emit('patrolUpdate', {
        guardId,
        checkpointId,
        checkpointOrder: checkpoint.order,
        timestamp: patrolLog.timestamp,
        event: 'checkpoint_scanned',
      })
    }

    return res.status(201).json({
      message: `Circle ${checkpoint.order} checkpoint scanned successfully`,
      log: {
        id: patrolLog._id,
        checkpointId: patrolLog.checkpointId,
        order: patrolLog.checkpointOrder,
        timestamp: patrolLog.timestamp,
        guardName: guard.username,
      },
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

const getRoute = async (req, res) => {
  const guardId = req.userId

  try {
    const { guard, checkpoints } = await getAssignedRoute(guardId)
    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }

    const logs = await PatrolLog.find({
      guardId,
      status: 'completed',
      checkpointId: { $in: checkpoints.map((checkpoint) => checkpoint.checkpointId) },
    }).lean()
    const completedByOrder = new Map()

    logs.forEach((log) => {
      const existing = completedByOrder.get(log.checkpointOrder)
      if (!existing || new Date(log.timestamp) > new Date(existing.timestamp)) {
        completedByOrder.set(log.checkpointOrder, log)
      }
    })

    const nextPendingOrder = checkpoints.find((checkpoint) => !completedByOrder.has(checkpoint.order))?.order || null

    const route = checkpoints.map((checkpoint) => {
      const completed = completedByOrder.get(checkpoint.order)
      return {
        checkpointId: checkpoint.checkpointId,
        order: checkpoint.order,
        location: checkpoint.location,
        status: completed ? 'completed' : 'pending',
        canScan: checkpoint.order === nextPendingOrder,
        completedAt: completed ? completed.timestamp : null,
        completedBy: completed ? guard.username : null,
      }
    })

    return res.json({
      message: 'Guard patrol route retrieved',
      guard: {
        id: guardId,
        username: guard.username,
        assignedCheckpointIds: guard.assignedCheckpointIds || [],
      },
      nextPendingOrder,
      route,
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

module.exports = { scanCheckpoint, getRoute }
