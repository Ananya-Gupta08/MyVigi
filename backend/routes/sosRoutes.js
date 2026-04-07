const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const { createSOS, getSOS, updateSOS } = require('../controllers/sosController')

router.post('/', authMiddleware, createSOS)
router.get('/', authMiddleware, getSOS)
router.patch('/:id', authMiddleware, updateSOS)

module.exports = router
