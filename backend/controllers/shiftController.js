const Shift = require('../models/Shift')

const startShift = async (req, res) => {
  const { qrCode, latitude, longitude } = req.body
  const userId = req.userId

  try {
    const activeShift = await Shift.findOne({ userId, status: 'active' })
    if (activeShift) {
      return res.status(400).json({ message: 'User already has an active shift' })
    }

    if (latitude !== undefined && longitude !== undefined) {
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ message: 'Invalid geolocation coordinates' })
      }
    }

    const shift = new Shift({
      userId,
      qrCode: qrCode || 'SHIFT_START',
      location: latitude !== undefined && longitude !== undefined ? { latitude, longitude } : {},
    })

    await shift.save()

    res.status(201).json({
      message: 'Shift started successfully',
      shift: {
        id: shift._id,
        startTime: shift.startTime,
        status: shift.status,
        durationHours: 0,
      },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const endShift = async (req, res) => {
  const userId = req.userId

  try {
    const shift = await Shift.findOne({ userId, status: 'active' })
    if (!shift) {
      return res.status(404).json({ message: 'No active shift found' })
    }

    shift.endTime = new Date()
    shift.status = 'completed'
    const durationMs = shift.endTime - shift.startTime
    shift.durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100
    await shift.save()

    res.json({
      message: 'Shift ended successfully',
      shift: {
        id: shift._id,
        startTime: shift.startTime,
        endTime: shift.endTime,
        durationHours: shift.durationHours,
        status: shift.status,
      },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getActiveShift = async (req, res) => {
  const userId = req.userId

  try {
    const shift = await Shift.findOne({ userId, status: 'active' }).lean()
    res.json({
      message: 'Active shift retrieved',
      shift: shift || null,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getShiftHistory = async (req, res) => {
  const userId = req.userId

  try {
    const shifts = await Shift.find({ userId }).sort('-startTime')
    res.json({
      message: 'Shift history retrieved',
      shifts,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { startShift, endShift, getActiveShift, getShiftHistory }
