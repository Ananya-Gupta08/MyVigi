const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const {
  createRequest,
  approveRequest,
  rejectRequest,
  getUserRequests,
  getPendingRequests,
} = require('../controllers/requestController')

router.post('/create', authMiddleware, createRequest)
router.post('/approve', authMiddleware, approveRequest)
router.post('/reject', authMiddleware, rejectRequest)
router.get('/my-requests', authMiddleware, getUserRequests)
router.get('/pending', authMiddleware, getPendingRequests)

module.exports = router
