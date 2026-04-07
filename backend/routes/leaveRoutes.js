const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const { requestLeave, getLeaveRequests, reviewLeave } = require('../controllers/leaveController')

router.post('/request', authMiddleware, requestLeave)
router.get('/', authMiddleware, getLeaveRequests)
router.patch('/:id', authMiddleware, reviewLeave)

module.exports = router
