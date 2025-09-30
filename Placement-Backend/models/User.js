// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['student', 'recruiter'], required: true },
  name: { type: String, required: true, trim: true },
  cgpa: { type: Number, min: 0, max: 10 },
  branch: { type: String, trim: true },
  company: { type: String, trim: true },
  // New fields for student profile
  tenthScore: { type: Number, min: 0, max: 100 },
  twelfthScore: { type: Number, min: 0, max: 100 },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);