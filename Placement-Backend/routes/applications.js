// routes/applications.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Resume = require('../models/Resume');
const { addApplicationToSheet, updateApplicationStatusInSheet } = require('../utils/googleSheets');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

// Apply to a job - UPDATED WITH CUSTOM ANSWERS
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  const { jobId, resumeId, customAnswers } = req.body;

  if (!jobId || !resumeId) {
    return res.status(400).json({ msg: 'Job ID and resume ID are required' });
  }

  try {
    const job = await Job.findById(jobId).populate('recruiterId', 'company');
    if (!job) {
      return res.status(404).json({ msg: 'Job not found' });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume || resume.studentId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Resume not found or not authorized' });
    }

    // Validate required custom questions
    if (job.customQuestions && job.customQuestions.length > 0) {
      const requiredQuestions = job.customQuestions.filter(q => q.required);
      for (const question of requiredQuestions) {
        const answer = customAnswers?.find(a => a.question === question.question);
        if (!answer || !answer.answer.trim()) {
          return res.status(400).json({ 
            msg: `Please answer the required question: "${question.question}"` 
          });
        }
      }
    }

    const application = new Application({
      jobId,
      studentId: req.user.id,
      resumeId,
      status: 'pending',
      customAnswers: customAnswers || []
    });

    await application.save();

    // Add to Google Sheet with custom answers
    try {
      const student = await User.findById(req.user.id);
      await addApplicationToSheet(
        student.name,
        job.recruiterId.company || 'N/A',
        job.title,
        resume.title,
        application.appliedAt,
        application.status,
        resume.googleDriveLink,
        student.tenthScore || 'N/A',
        student.twelfthScore || 'N/A',
        student.cgpa || 'N/A',
        student.branch || 'N/A',
        customAnswers || []
      );
    } catch (sheetErr) {
      console.error('Google Sheets error (non-critical):', sheetErr.message);
      // Continue even if Sheets fails
    }

    res.status(201).json(application);
  } catch (err) {
    console.error('Application error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// ... rest of the routes remain similar but update the populate to include customAnswers
router.get('/recruiters/:jobId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'recruiter') return res.status(403).json({ msg: 'Access denied' });

  try {
    const job = await Job.findById(req.params.jobId);
    if (!job || job.recruiterId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const applications = await Application.find({ jobId: req.params.jobId })
      .populate('studentId', 'name email cgpa branch tenthScore twelfthScore')
      .populate('resumeId', 'title googleDriveLink')
      .populate('jobId', 'title');
    res.json(applications);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get my applications (student) - UPDATED TO INCLUDE CUSTOM ANSWERS
router.get('/my', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    const applications = await Application.find({ studentId: req.user.id })
      .populate('jobId', 'title recruiterId customQuestions')
      .populate('resumeId', 'title googleDriveLink');
    res.json(applications);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Update application status (recruiter) - remains the same
router.put('/:id/status', authMiddleware, async (req, res) => {
  if (req.user.role !== 'recruiter') return res.status(403).json({ msg: 'Access denied' });

  const { status } = req.body;

  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ msg: 'Invalid status' });
  }

  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ msg: 'Application not found' });
    }

    const job = await Job.findById(application.jobId);
    if (job.recruiterId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    application.status = status;
    await application.save();

    // Update status in Google Sheet
    try {
      await updateApplicationStatusInSheet(application.appliedAt.toISOString(), status);
    } catch (sheetErr) {
      console.error('Google Sheets update error (non-critical):', sheetErr.message);
    }

    res.json(application);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;