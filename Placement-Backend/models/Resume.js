const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  googleDriveLink: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true, default: 'Resume' },
  uploadedAt: { type: Date, default: Date.now },
  skillAnalysis: { type: mongoose.Schema.Types.Mixed },
  fileName: { type: String, required: true }, // Added
  filePath: { type: String }, // Added for local storage path
  mimeType: { type: String }, // Added
  fileSize: { type: Number }, // Added
  folderPath: { type: String } // Added
});

module.exports = mongoose.model('Resume', resumeSchema);
