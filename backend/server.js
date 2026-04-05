const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const apiRoutes = require('./routes/patrolRoutes')
app.use('/api', apiRoutes)

// TODO: add more API routes as project requirements are defined
app.get('/', (req, res) => {
  res.send('MERN backend is running')
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
