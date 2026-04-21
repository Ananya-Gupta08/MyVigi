const Checkpoint = require('../models/Checkpoint')
const PatrolLog = require('../models/PatrolLog')

const scanCheckpoint = async (req, res) => {
  const { checkpointId } = req.body
  const guardId = req.userId

  if (!checkpointId) {
    return res.status(400).json({ message: 'checkpointId is required' })
  }

  try {
    const checkpoint = await Checkpoint.findOne({ checkpointId })
    if (!checkpoint) {
      return res.status(400).json({ message: 'Invalid checkpoint ID' })
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

    const lastLog = await PatrolLog.findOne({ guardId, status: 'completed' })
      .sort('-timestamp')
      .lean()

    if (lastLog && lastLog.checkpointOrder) {
      const expectedOrder = lastLog.checkpointOrder + 1

      if (checkpoint.order !== expectedOrder) {
        return res.status(400).json({
          message: `Checkpoint sequence locked. Expected checkpoint order ${expectedOrder}`,
          currentOrder: checkpoint.order,
          expectedOrder,
        })
      }
    } else {
      if (checkpoint.order !== 1) {
        return res.status(400).json({
          message: 'Start with the first checkpoint',
          expectedOrder: 1,
          currentOrder: checkpoint.order,
        })
      }
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
      message: 'Checkpoint scanned successfully',
      log: {
        id: patrolLog._id,
        checkpointId: patrolLog.checkpointId,
        order: patrolLog.checkpointOrder,
        timestamp: patrolLog.timestamp,
      },
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

const getRoute = async (req, res) => {
  const guardId = req.userId

  try {
    const checkpoints = await Checkpoint.find().sort('order').lean()
    const logs = await PatrolLog.find({ guardId, status: 'completed' }).lean()
    const completedByOrder = new Map()

    logs.forEach((log) => {
      const existing = completedByOrder.get(log.checkpointOrder)
      if (!existing || new Date(log.timestamp) > new Date(existing.timestamp)) {
        completedByOrder.set(log.checkpointOrder, log)
      }
    })

    const route = checkpoints.map((checkpoint) => {
      const completed = completedByOrder.get(checkpoint.order)
      return {
        checkpointId: checkpoint.checkpointId,
        order: checkpoint.order,
        location: checkpoint.location,
        status: completed ? 'completed' : 'pending',
        completedAt: completed ? completed.timestamp : null,
      }
    })

    return res.json({
      message: 'Guard patrol route retrieved',
      route,
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

module.exports = { scanCheckpoint, getRoute }
