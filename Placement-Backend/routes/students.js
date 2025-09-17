const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Resume = require('../models/Resume');
const router = express.Router();

// Get profile
router.get('/profile', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });
  res.json(req.user);
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    const { cgpa, branch } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { cgpa: parseFloat(cgpa), branch },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Upload resume
router.post('/resumes', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    const { googleDriveLink, title } = req.body;
    if (!googleDriveLink || !title) return res.status(400).json({ msg: 'Missing required fields' });
    const resume = new Resume({ studentId: req.user.id, googleDriveLink, title });
    await resume.save();
    res.json(resume);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get resumes
router.get('/resumes', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    const resumes = await Resume.find({ studentId: req.user.id }).sort({ uploadedAt: -1 });
    res.json(resumes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
