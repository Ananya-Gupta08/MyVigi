const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const { startShift, endShift, getShiftHistory } = require('../controllers/shiftController')

router.post('/start', authMiddleware, startShift)
router.post('/end', authMiddleware, endShift)
router.get('/history', authMiddleware, getShiftHistory)

module.exports = router
