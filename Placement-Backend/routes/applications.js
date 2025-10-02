// routes/applications.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Resume = require('../models/Resume');
const { addApplicationToSheet, updateApplicationStatusInSheet } = require('../utils/googleSheets');
const { getAnalysisFromDrive } = require('../utils/driveOAuth'); // ADD THIS IMPORT
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

// Helper function to filter jobs based on resume analysis
async function getMatchingJobs(resumeId, allJobs) {
  try {
    // Try to get analysis from database first (stored in resume)
    const resume = await Resume.findById(resumeId);
    
    if (resume && resume.skillAnalysis && resume.skillAnalysis.bestRoles) {
      const bestRoles = resume.skillAnalysis.bestRoles;
      
      return allJobs.filter(job => 
        job.suitableRoles && job.suitableRoles.some(role => 
          bestRoles.includes(role)
        )
      );
    }
    
    // If no analysis in database, try to get from Drive
    const analysis = await getAnalysisFromDrive(resumeId);
    
    if (analysis && analysis.bestRoles) {
      return allJobs.filter(job => 
        job.suitableRoles && job.suitableRoles.some(role => 
          analysis.bestRoles.includes(role)
        )
      );
    }
    
    // If no analysis available, return all jobs (fallback)
    console.log(`No analysis found for resume ${resumeId}, showing all jobs`);
    return allJobs;
    
  } catch (error) {
    console.error('Error in job matching:', error);
    // On error, return all jobs as fallback
    return allJobs;
  }
}

// Get jobs filtered by resume analysis - ADD THIS NEW ROUTE
router.get('/jobs/:resumeId', authMiddleware.auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    // Verify the resume belongs to the student
    const resume = await Resume.findById(req.params.resumeId);
    if (!resume || resume.studentId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Resume not found or not authorized' });
    }

    // Get all jobs
    const allJobs = await Job.find().populate('recruiterId', 'company name').sort({ postedAt: -1 });
    
    // Filter jobs based on resume analysis
    const matchingJobs = await getMatchingJobs(req.params.resumeId, allJobs);
    
    res.json({
      jobs: matchingJobs,
      totalJobs: allJobs.length,
      matchingJobs: matchingJobs.length,
      message: matchingJobs.length < allJobs.length ? 
        `Showing ${matchingJobs.length} jobs that match your skills` : 
        'Showing all available jobs'
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Apply to a job - UPDATED WITH CUSTOM ANSWERS
router.post('/', authMiddleware.auth, async (req, res) => {
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
        application._id.toString(),
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

// Get applications for a specific job (recruiter)
router.get('/recruiters/:jobId', authMiddleware.auth, async (req, res) => {
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
router.get('/my', authMiddleware.auth, async (req, res) => {
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
// Update application status (recruiter) - FIX THIS ROUTE
router.put('/:id/status', authMiddleware.auth, async (req, res) => {
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

    // Update status in Google Sheet - FIX THIS CALL
    try {
      // Pass the application ID, NOT the appliedAt timestamp
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