const mongoose = require('mongoose');

const jobRequestSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  formId: { type: String }
});

module.exports = mongoose.model('JobRequest', jobRequestSchema);