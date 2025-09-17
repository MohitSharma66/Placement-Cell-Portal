const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  minCgpa: { type: Number, min: 0, max: 10 },
  branch: { type: String, trim: true },
  requirements: { type: [String], default: [] },
  postedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Job', jobSchema);
