//routers

const express = require('express')
const router = express.Router()

const authRoutes = require('./authRoutes')
const patrolRoutes = require('./patrolRoutes')
const shiftRoutes = require('./shiftRoutes')
const requestRoutes = require('./requestRoutes')
const leaveRoutes = require('./leaveRoutes')
const sosRoutes = require('./sosRoutes')
const adminRoutes = require('./adminRoutes')

router.use('/auth', authRoutes)
router.use('/patrol', patrolRoutes)
router.use('/shift', shiftRoutes)
router.use('/request', requestRoutes)
router.use('/leave', leaveRoutes)
router.use('/sos', sosRoutes)
router.use('/admin', adminRoutes)

router.get('/', (req, res) => {
  res.json({ message: 'API is connected' })
})

module.exports = router
