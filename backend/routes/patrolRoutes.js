// Placeholder route file for backend API endpoints
// Add route handlers here as the project grows.

const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'API routes will be added here' })
})

module.exports = router
