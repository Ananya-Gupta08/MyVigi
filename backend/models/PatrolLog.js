// Placeholder model file for backend data schemas
// Define Mongoose models here when the MongoDB schema is ready.

const mongoose = require('mongoose')

const placeholderSchema = new mongoose.Schema({}, { strict: false })

module.exports = mongoose.model('Placeholder', placeholderSchema)
