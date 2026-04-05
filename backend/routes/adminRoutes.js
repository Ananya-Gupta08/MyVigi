const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const { getGuardsData, getPatrolUpdates } = require('../controllers/adminController')

router.get('/guards', authMiddleware, getGuardsData)
router.get('/patrol-updates', authMiddleware, getPatrolUpdates)

module.exports = router
