const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const { getGuardsData, getGuardDetails, getPatrolUpdates } = require('../controllers/adminController')

router.get('/guards', authMiddleware, getGuardsData)
router.get('/guards-status', authMiddleware, getGuardsData)
router.get('/guards/:id', authMiddleware, getGuardDetails)
router.get('/patrol-updates', authMiddleware, getPatrolUpdates)

module.exports = router
