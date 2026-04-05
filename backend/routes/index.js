//routers

const express = require('express')
const router = express.Router()

const authRoutes = require('./authRoutes')
const patrolRoutes = require('./patrolRoutes')
const shiftRoutes = require('./shiftRoutes')
const requestRoutes = require('./requestRoutes')

router.use('/auth', authRoutes)
router.use('/patrol', patrolRoutes)
router.use('/shift', shiftRoutes)
router.use('/request', requestRoutes)

router.get('/', (req, res) => {
  res.json({ message: 'API is connected' })
})

module.exports = router
