// models/Job.js
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  minCgpa: {
    type: Number,
  },
  branch: {
    type: String,
  },
  requirements: {
    type: [String],
  },
  postedAt: {
    type: Date,
    default: Date.now,
  },
  // Add custom questions field
  customQuestions: [{
    question: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'textarea', 'select'],
      default: 'text'
    },
    options: [String], // For select type
    required: {
      type: Boolean,
      default: false
    }
  }]
});

module.exports = mongoose.model('Job', jobSchema);