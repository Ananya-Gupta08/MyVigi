const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const { startShift, endShift, getActiveShift, getShiftHistory } = require('../controllers/shiftController')

router.post('/start', authMiddleware, startShift)
router.post('/end', authMiddleware, endShift)
router.get('/active', authMiddleware, getActiveShift)
router.get('/history', authMiddleware, getShiftHistory)

module.exports = router
