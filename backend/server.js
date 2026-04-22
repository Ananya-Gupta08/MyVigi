const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv').config()
const http = require('http')
const socketIo = require('socket.io')
const connectDB = require('./config/db')
const { notFound, errorHandler } = require('./middleware/errorHandler')
const apiRoutes = require('./routes')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: 'https://my-vigi.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
})
const PORT = process.env.PORT || 4444

app.use(cors({
  origin: 'https://my-vigi.vercel.app',
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: false }))

app.use('/api', apiRoutes)

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

app.set('io', io)

app.get('/', (req, res) => {
  res.send('MERN backend is running')
})

app.use(notFound)
app.use(errorHandler)

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message)
    process.exit(1)
  })
