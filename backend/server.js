const express = require('express')
const cors = require('cors')

const { notFound, errorHandler } = require('./middleware/errorHandler')
const apiRoutes = require('./routes')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use('/api', apiRoutes)

app.get('/', (req, res) => {
  res.send('MERN backend is running')
})

app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
