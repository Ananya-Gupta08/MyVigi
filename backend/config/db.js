const mongoose = require('mongoose')

async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI
  const conn = await mongoose.connect(uri)
  console.log(`MongoDB connected: ${conn.connection.host}`)
}

module.exports = connectDB
