const express = require('express');
const auth = require('../middleware/auth');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Resume = require('../models/Resume');
const {
  addApplicationToSheet,
  updateApplicationStatusInSheet,
} = require('../utils/googleSheets');
const router = express.Router();

// Apply to job
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'student')
    return res.status(403).json({ msg: 'Access denied' });

  try {
    const { jobId, resumeId } = req.body;
    if (!jobId || !resumeId)
      return res.status(400).json({ msg: 'Missing required fields' });

    const job = await Job.findById(jobId).populate('recruiterId', 'company');
    if (!job) return res.status(404).json({ msg: 'Job not found' });

    const user = await User.findById(req.user.id);
    if (job.minCgpa && user.cgpa < job.minCgpa) {
      return res
        .status(400)
        .json({ msg: 'Do not meet minimum CGPA requirement' });
    }
    if (job.branch && user.branch !== job.branch) {
      return res.status(400).json({ msg: 'Branch mismatch' });
    }

    const existingApplication = await Application.findOne({
      studentId: req.user.id,
      jobId,
    });
    if (existingApplication)
      return res.status(400).json({ msg: 'Already applied to this job' });

    const application = new Application({
      studentId: req.user.id,
      jobId,
      resumeId,
    });
    await application.save();

    // Add to Google Sheet
    const resume = await Resume.findById(resumeId);
    const success = await addApplicationToSheet(
      user.name,
      job.recruiterId.company || 'N/A',
      job.title,
      resume.title,
      application.appliedAt,
      application.status,
      resume.googleDriveLink
    );
    if (!success) {
      console.error('Failed to add application to Google Sheet');
    }

    res.json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get student applications
router.get('/my', auth, async (req, res) => {
  if (req.user.role !== 'student')
    return res.status(403).json({ msg: 'Access denied' });

  try {
    const applications = await Application.find({ studentId: req.user.id })
      .populate('jobId', 'title description recruiterId')
      .populate('resumeId', 'title googleDriveLink')
      .sort({ appliedAt: -1 });
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get recruiter applications
router.get('/recruiter/:jobId', auth, async (req, res) => {
  if (req.user.role !== 'recruiter')
    return res.status(403).json({ msg: 'Access denied' });

  try {
    const job = await Job.findById(req.params.jobId);
    if (!job || job.recruiterId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const applications = await Application.find({ jobId: req.params.jobId })
      .populate('studentId', 'email name cgpa branch')
      .populate('resumeId', 'title googleDriveLink')
      .sort({ appliedAt: -1 });
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update application status
router.put('/:appId/status', auth, async (req, res) => {
  if (req.user.role !== 'recruiter')
    return res.status(403).json({ msg: 'Access denied' });

  const { status } = req.body;
  if (!['pending', 'accepted', 'rejected'].includes(status))
    return res.status(400).json({ msg: 'Invalid status' });

  try {
    const app = await Application.findById(req.params.appId).populate('jobId');
    if (!app) return res.status(404).json({ msg: 'Application not found' });
    if (app.jobId.recruiterId.toString() !== req.user.id)
      return res.status(403).json({ msg: 'Access denied' });

    app.status = status;
    await app.save();

    // Update status in Google Sheet
    const success = await updateApplicationStatusInSheet(
      app.appliedAt.toISOString(),
      status
    );
    if (!success) {
      console.error('Failed to update status in Google Sheet');
    }

    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
