const SOSAlert = require('../models/SOSAlert')

const createSOS = async (req, res) => {
  const { reason, latitude, longitude } = req.body
  const guardId = req.userId

  if (!reason || reason.trim() === '') {
    return res.status(400).json({ message: 'Reason is required' })
  }

  try {
    const sosAlert = new SOSAlert({
      guardId,
      reason,
      status: 'active',
      location: latitude !== undefined && longitude !== undefined ? { latitude, longitude } : {},
    })

    await sosAlert.save()
    await sosAlert.populate('guardId', 'username email')

    res.status(201).json({
      message: 'SOS alert created',
      alert: {
        id: sosAlert._id,
        guardId: sosAlert.guardId,
        reason: sosAlert.reason,
        location: sosAlert.location,
        status: sosAlert.status,
        createdAt: sosAlert.createdAt,
      },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getSOS = async (req, res) => {
  const adminRole = req.userRole

  if (adminRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  try {
    const alerts = await SOSAlert.find()
      .populate('guardId', 'username email')
      .populate('resolvedBy', 'username')
      .sort('-createdAt')

    res.json({
      message: 'SOS alerts retrieved',
      alerts,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const updateSOS = async (req, res) => {
  const { sosId, status } = req.body
  const adminId = req.userId
  const adminRole = req.userRole

  if (adminRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  if (!sosId || !status) {
    return res.status(400).json({ message: 'SOS ID and status are required' })
  }

  if (!['active', 'resolved'].includes(status)) {
    return res.status(400).json({ message: 'Status must be active or resolved' })
  }

  try {
    const sosAlert = await SOSAlert.findById(sosId)

    if (!sosAlert) {
      return res.status(404).json({ message: 'SOS alert not found' })
    }

    sosAlert.status = status
    if (status === 'resolved') {
      sosAlert.resolvedAt = new Date()
      sosAlert.resolvedBy = adminId
    }
    await sosAlert.save()

    res.json({
      message: `SOS alert ${status}`,
      alert: {
        id: sosAlert._id,
        status: sosAlert.status,
        resolvedAt: sosAlert.resolvedAt,
      },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { createSOS, getSOS, updateSOS }
