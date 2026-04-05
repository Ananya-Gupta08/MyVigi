const Shift = require('../models/Shift')

const startShift = async (req, res) => {
  const { qrCode, latitude, longitude } = req.body
  const userId = req.userId

  if (!qrCode || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ message: 'QR code and geolocation required' })
  }

  // Validate latitude and longitude
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ message: 'Invalid geolocation coordinates' })
  }

  try {
    // Check if user already has an active shift
    const activeShift = await Shift.findOne({ userId, status: 'active' })
    if (activeShift) {
      return res.status(400).json({ message: 'User already has an active shift' })
    }

    // Create new shift
    const shift = new Shift({
      userId,
      qrCode,
      location: { latitude, longitude },
    })

    await shift.save()

    res.status(201).json({
      message: 'Shift started successfully',
      shift: {
        id: shift._id,
        qrCode: shift.qrCode,
        location: shift.location,
        startTime: shift.startTime,
        status: shift.status,
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
    await shift.save()

    res.json({
      message: 'Shift ended successfully',
      shift: {
        id: shift._id,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: shift.status,
      },
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

module.exports = { startShift, endShift, getShiftHistory }
