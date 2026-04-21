const mongoose = require('mongoose')
const dotenv = require('dotenv').config()
const Checkpoint = require('../models/Checkpoint')

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/myvigi'
    await mongoose.connect(uri)
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  }
}

const seedCheckpoints = async () => {
  try {
    const checkpoints = [
      { checkpointId: 'P1', order: 1, location: 'Main Gate' },
      { checkpointId: 'P2', order: 2, location: 'Building A - Front' },
      { checkpointId: 'P3', order: 3, location: 'Building A - Back' },
      { checkpointId: 'P4', order: 4, location: 'Parking Zone' },
      { checkpointId: 'P5', order: 5, location: 'Storage Area' },
      { checkpointId: 'P6', order: 6, location: 'Building B - Entry' },
      { checkpointId: 'P7', order: 7, location: 'Building B - Exit' },
      { checkpointId: 'P8', order: 8, location: 'Emergency Exit' },
    ]

    // Clear existing checkpoints
    await Checkpoint.deleteMany({})
    console.log('Cleared existing checkpoints')

    // Insert new checkpoints
    const result = await Checkpoint.insertMany(checkpoints)
    console.log(`Successfully seeded ${result.length} checkpoints:`)
    result.forEach((cp) => {
      console.log(`  - ${cp.checkpointId}: ${cp.location} (Order: ${cp.order})`)
    })

    process.exit(0)
  } catch (err) {
    console.error('Error seeding checkpoints:', err)
    process.exit(1)
  }
}

connectDB().then(seedCheckpoints)
