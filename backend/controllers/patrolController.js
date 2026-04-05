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
      return res.status(400).json({ message: 'Invalid QR code' })
    }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    const duplicate = await PatrolLog.findOne({
      guardId,
      checkpointId,
      timestamp: { $gte: thirtyMinutesAgo },
    })

    if (duplicate) {
      return res.status(400).json({ message: 'Duplicate scan detected within 30 minutes' })
    }

    const patrolLog = new PatrolLog({ guardId, checkpointId })
    await patrolLog.save()

    return res.status(201).json({ message: 'Patrol scan recorded', patrolLog })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

module.exports = { scanCheckpoint }
