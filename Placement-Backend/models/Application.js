const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },
  appliedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'pending', enum: ['pending', 'accepted', 'rejected'] },
});

module.exports = mongoose.model('Application', applicationSchema);
