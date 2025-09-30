// routes/jobs.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const Job = require('../models/Job');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

// Post a new job - FIXED REQUIREMENTS HANDLING
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'recruiter') return res.status(403).json({ msg: 'Access denied' });

  try {
    const { title, description, minCgpa, branch, requirements, customQuestions } = req.body;
    
    if (!title || !description) return res.status(400).json({ msg: 'Missing required fields' });

    // Handle requirements - it can be string or array
    let processedRequirements = [];
    if (requirements) {
      if (Array.isArray(requirements)) {
        // If it's already an array, use it directly
        processedRequirements = requirements.filter(r => r && r.trim());
      } else if (typeof requirements === 'string') {
        // If it's a string, split by commas
        processedRequirements = requirements.split(',').map(r => r.trim()).filter(r => r);
      }
    }

    const job = new Job({
      recruiterId: req.user.id,
      title,
      description,
      minCgpa: parseFloat(minCgpa) || undefined,
      branch,
      requirements: processedRequirements,
      customQuestions: customQuestions || []
    });

    await job.save();
    res.json(job);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find().populate('recruiterId', 'company name').sort({ postedAt: -1 });
    res.json(jobs);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get job by ID including custom questions
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('recruiterId', 'company name');
    if (!job) {
      return res.status(404).json({ msg: 'Job not found' });
    }
    res.json(job);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;