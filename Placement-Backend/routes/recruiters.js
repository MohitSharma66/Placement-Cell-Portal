const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Get profile
router.get('/profile', auth, async (req, res) => {
  if (req.user.role !== 'recruiter') return res.status(403).json({ msg: 'Access denied' });
  res.json(req.user);
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  if (req.user.role !== 'recruiter') return res.status(403).json({ msg: 'Access denied' });

  try {
    const { company } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { company },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Optional: Keep job request if still relevant (commented out for now)
// router.post('/job-request', auth, async (req, res) => {
//   if (req.user.role !== 'recruiter') return res.status(403).json({ msg: 'Access denied' });

//   try {
//     const { title, description, minCgpa, branch, requirements, questions } = req.body;
//     if (!title || !description || !questions) return res.status(400).json({ msg: 'Required fields missing' });

//     const request = new JobRequest({
//       recruiterId: req.user.id,
//       title,
//       description,
//       minCgpa,
//       branch,
//       requirements,
//       questions,
//     });
//     await request.save();

//     res.status(201).json({ msg: 'Job request submitted successfully', requestId: request._id });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// });

module.exports = router;