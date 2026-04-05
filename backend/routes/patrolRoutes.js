const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const { scanCheckpoint } = require('../controllers/patrolController')

router.post('/scan', authMiddleware, scanCheckpoint)

module.exports = router
