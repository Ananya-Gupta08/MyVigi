const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const { scanCheckpoint, getRoute } = require('../controllers/patrolController')

router.get('/route', authMiddleware, getRoute)
router.post('/scan', authMiddleware, scanCheckpoint)

module.exports = router
