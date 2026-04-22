const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const {
  getGuardsData,
  getGuardDetails,
  getPatrolUpdates,
  getAvailableCheckpoints,
  updateGuardRoute,
  resetGuardPatrolRoute,
} = require('../controllers/adminController')

router.get('/checkpoints', authMiddleware, getAvailableCheckpoints)
router.get('/guards', authMiddleware, getGuardsData)
router.get('/guards-status', authMiddleware, getGuardsData)
router.get('/guards/:id', authMiddleware, getGuardDetails)
router.patch('/guards/:id/route', authMiddleware, updateGuardRoute)
router.post('/guards/:id/route/reset', authMiddleware, resetGuardPatrolRoute)
router.get('/patrol-updates', authMiddleware, getPatrolUpdates)

module.exports = router
