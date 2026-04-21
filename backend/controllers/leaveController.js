const LeaveRequest = require('../models/LeaveRequest')
const User = require('../models/User')

const requestLeave = async (req, res) => {
  const { reason, startDate, endDate } = req.body
  const guardId = req.userId

  if (!reason || reason.trim() === '') {
    return res.status(400).json({ message: 'Reason is required' })
  }

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ message: 'Invalid date format' })
  }

  if (start >= end) {
    return res.status(400).json({ message: 'End date must be after start date' })
  }

  try {
    const leaveRequest = new LeaveRequest({
      guardId,
      reason,
      startDate: start,
      endDate: end,
    })

    await leaveRequest.save()

    res.status(201).json({
      message: 'Leave request submitted',
      leave: {
        id: leaveRequest._id,
        reason: leaveRequest.reason,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        status: leaveRequest.status,
        requestedAt: leaveRequest.requestedAt,
      },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getLeaveRequests = async (req, res) => {
  const userId = req.userId
  const userRole = req.userRole

  try {
    let leaves
    if (userRole === 'admin') {
      leaves = await LeaveRequest.find()
        .populate('guardId', 'username email')
        .populate('reviewedBy', 'username')
        .sort('-requestedAt')
    } else {
      leaves = await LeaveRequest.find({ guardId: userId })
        .populate('guardId', 'username email')
        .populate('reviewedBy', 'username')
        .sort('-requestedAt')
    }

    res.json({
      message: 'Leave requests retrieved',
      leaves,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const reviewLeave = async (req, res) => {
  const { status, adminNotes } = req.body
  const leaveId = req.params.id || req.body.leaveId
  const adminId = req.userId
  const adminRole = req.userRole

  if (adminRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  if (!leaveId || !status) {
    return res.status(400).json({ message: 'Leave ID and status are required' })
  }

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be approved or rejected' })
  }

  try {
    const leaveRequest = await LeaveRequest.findById(leaveId)

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' })
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot review non-pending leave request' })
    }

    leaveRequest.status = status
    leaveRequest.adminNotes = adminNotes || ''
    leaveRequest.reviewedAt = new Date()
    leaveRequest.reviewedBy = adminId
    await leaveRequest.save()

    res.json({
      message: `Leave request ${status}`,
      leave: {
        id: leaveRequest._id,
        status: leaveRequest.status,
        adminNotes: leaveRequest.adminNotes,
        reviewedAt: leaveRequest.reviewedAt,
      },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { requestLeave, getLeaveRequests, reviewLeave }
