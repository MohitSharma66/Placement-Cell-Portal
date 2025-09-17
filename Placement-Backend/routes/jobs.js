const express = require('express');
const auth = require('../middleware/auth');
const Job = require('../models/Job');
const router = express.Router();

// Post job
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'recruiter') return res.status(403).json({ msg: 'Access denied' });

  try {
    const { title, description, minCgpa, branch, requirements } = req.body;
    if (!title || !description) return res.status(400).json({ msg: 'Missing required fields' });

    const job = new Job({
      recruiterId: req.user.id,
      title,
      description,
      minCgpa: parseFloat(minCgpa),
      branch,
      requirements: requirements || []
    });

    await job.save();
    res.json(job);
  } catch (err) {
    console.log(err);
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find().populate('recruiterId', 'company name').sort({ postedAt: -1 });
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
