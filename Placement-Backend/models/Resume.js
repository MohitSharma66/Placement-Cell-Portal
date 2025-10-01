const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  googleDriveLink: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true, default: 'Resume' },
  uploadedAt: { type: Date, default: Date.now },
  skillAnalysis: { type: mongoose.Schema.Types.Mixed }
});

module.exports = mongoose.model('Resume', resumeSchema);
