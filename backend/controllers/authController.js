const jwt = require('jsonwebtoken')
const User = require('../models/User')

const signup = async (req, res) => {
  const { username, email, password, role } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' })
  }

  try {
    const existing = await User.findOne({ $or: [{ username }, { email }] })
    if (existing) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const user = new User({ username, email, password, role: role || 'guard' })
    await user.save()

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret_key_change_me',
      { expiresIn: '24h' }
    )

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const login = async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' })
  }

  try {
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret_key_change_me',
      { expiresIn: '24h' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { signup, login }
