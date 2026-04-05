//routers

const express = require('express')
const router = express.Router()

const patrolRoutes = require('./patrolRoutes')

router.use('/patrol', patrolRoutes)

router.get('/', (req, res) => {
  res.json({ message: 'API is connected' })
})

module.exports = router
