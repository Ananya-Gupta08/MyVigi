const Request = require('../models/Request')
const User = require('../models/User')

const createRequest = async (req, res) => {
  const { type, reason } = req.body
  const userId = req.userId

  if (!type || !reason) {
    return res.status(400).json({ message: 'Type and reason are required' })
  }

  if (!['early_exit', 'leave'].includes(type)) {
    return res.status(400).json({ message: 'Invalid request type' })
  }

  try {
    const request = new Request({
      userId,
      type,
      reason,
    })

    await request.save()

    res.status(201).json({
      message: 'Request submitted successfully',
      request: {
        id: request._id,
        type: request.type,
        reason: request.reason,
        status: request.status,
        requestDate: request.requestDate,
      },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const approveRequest = async (req, res) => {
  const { requestId, approvalNotes } = req.body
  const adminId = req.userId
  const adminRole = req.userRole

  if (adminRole !== 'admin') {
    return res.status(403).json({ message: 'Only admins can approve requests' })
  }

  if (!requestId) {
    return res.status(400).json({ message: 'Request ID required' })
  }

  try {
    const request = await Request.findById(requestId)
    if (!request) {
      return res.status(404).json({ message: 'Request not found' })
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot approve non-pending request' })
    }

    request.status = 'approved'
    request.approvedBy = adminId
    request.approvalDate = new Date()
    request.approvalNotes = approvalNotes || ''
    await request.save()

    res.json({
      message: 'Request approved successfully',
      request: {
        id: request._id,
        type: request.type,
        status: request.status,
        approvalDate: request.approvalDate,
      },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const rejectRequest = async (req, res) => {
  const { requestId, approvalNotes } = req.body
  const adminId = req.userId
  const adminRole = req.userRole

  if (adminRole !== 'admin') {
    return res.status(403).json({ message: 'Only admins can reject requests' })
  }

  if (!requestId) {
    return res.status(400).json({ message: 'Request ID required' })
  }

  try {
    const request = await Request.findById(requestId)
    if (!request) {
      return res.status(404).json({ message: 'Request not found' })
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot reject non-pending request' })
    }

    request.status = 'rejected'
    request.approvedBy = adminId
    request.approvalDate = new Date()
    request.approvalNotes = approvalNotes || 'No reason provided'
    await request.save()

    res.json({
      message: 'Request rejected successfully',
      request: {
        id: request._id,
        type: request.type,
        status: request.status,
        approvalNotes: request.approvalNotes,
      },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getUserRequests = async (req, res) => {
  const userId = req.userId

  try {
    const requests = await Request.find({ userId }).sort('-requestDate')
    res.json({
      message: 'User requests retrieved',
      requests,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getPendingRequests = async (req, res) => {
  const adminRole = req.userRole

  if (adminRole !== 'admin') {
    return res.status(403).json({ message: 'Only admins can view all requests' })
  }

  try {
    const requests = await Request.find({ status: 'pending' })
      .populate('userId', 'username email role')
      .sort('-requestDate')

    res.json({
      message: 'Pending requests retrieved',
      requests,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { createRequest, approveRequest, rejectRequest, getUserRequests, getPendingRequests }
