// routes/applications.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Resume = require('../models/Resume');
const { addApplicationToSheet, updateApplicationStatusInSheet } = require('../utils/googleSheets');
const { getAnalysisFromDrive } = require('../utils/driveOAuth');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

// Helper function to filter jobs based on resume analysis
async function getMatchingJobs(resumeId, student, allJobs) {
  try {
    console.log('🔍 [getMatchingJobs] Checking jobs for student:', {
      name: student.name,
      cgpa: student.cgpa,
      branch: student.branch
    });
    
    console.log(`📦 Total jobs to check: ${allJobs.length}`);

    // First filter jobs based on student eligibility (CGPA, branch)
    const eligibleJobs = allJobs.filter(job => {
      console.log(`\n🔍 Checking job: "${job.title}"`);
      console.log('  Job requirements:', { minCgpa: job.minCgpa, branch: job.branch });
      
      // CGPA check
      if (job.minCgpa !== undefined && job.minCgpa !== null) {
        console.log(`  CGPA Check: Job requires ${job.minCgpa}, Student has ${student.cgpa}`);
        if (student.cgpa < job.minCgpa) {
          console.log(`  ❌ Rejected: CGPA ${student.cgpa} < ${job.minCgpa}`);
          return false;
        }
        console.log(`  ✅ CGPA OK: ${student.cgpa} >= ${job.minCgpa}`);
      }

      // Branch check - FIXED: Properly handle "Any" and comma-separated branches
      if (job.branch && job.branch.trim() !== '') {
        const jobBranchClean = job.branch.trim().toLowerCase();
        console.log(`  Branch Check: Job has "${job.branch}", Student has "${student.branch}"`);
        
        // Skip if branch is "any" (case-insensitive)
        if (jobBranchClean === 'any') {
          console.log('  ✅ Branch OK: No restriction ("Any")');
        } else {
          // Handle comma-separated branches (e.g., "CSE,AI,ECE")
          const jobBranches = job.branch.split(',').map(b => b.trim().toLowerCase());
          const studentBranch = student.branch ? student.branch.trim().toLowerCase() : '';
          
          console.log('  Job branches array:', jobBranches);
          console.log('  Student branch (cleaned):', studentBranch);
          
          if (studentBranch && !jobBranches.includes(studentBranch)) {
            console.log(`  ❌ Rejected: Student branch "${student.branch}" not in allowed branches`);
            return false;
          }
          console.log(`  ✅ Branch OK: "${student.branch}" is allowed`);
        }
      } else {
        console.log('  ✅ Branch OK: No branch requirement (empty/null)');
      }

      console.log(`  🎯 Job "${job.title}" is ELIGIBLE`);
      return true;
    });

    console.log(`\n📊 Eligibility Results: ${eligibleJobs.length}/${allJobs.length} jobs eligible`);
    
    if (eligibleJobs.length === 0) {
      console.log('⚠️ No eligible jobs found after CGPA/branch filtering');
      return [];
    }

    // Try to get analysis from database first (stored in resume)
    const resume = await Resume.findById(resumeId);
    
    if (resume && resume.skillAnalysis && resume.skillAnalysis.bestRoles) {
      const bestRoles = resume.skillAnalysis.bestRoles;
      console.log(`🎯 Found resume analysis with roles: ${bestRoles.join(', ')}`);
      
      const matchingJobs = eligibleJobs.filter(job => {
        const hasSuitableRoles = job.suitableRoles && job.suitableRoles.length > 0;
        if (!hasSuitableRoles) {
          console.log(`  Job "${job.title}" has no suitableRoles defined`);
          return false;
        }
        
        const matches = job.suitableRoles.some(role => bestRoles.includes(role));
        console.log(`  Job "${job.title}" roles: ${job.suitableRoles.join(', ')} - Matches: ${matches ? 'YES' : 'NO'}`);
        return matches;
      });
      
      console.log(`\n🎯 Skill Matching Results: ${matchingJobs.length}/${eligibleJobs.length} jobs match skills`);
      
      // Return matching jobs if any, otherwise return eligible jobs as fallback
      if (matchingJobs.length > 0) {
        console.log('✅ Returning skill-matched jobs');
        return matchingJobs;
      }
      console.log('⚠️ No skill-matched jobs, returning all eligible jobs');
      return eligibleJobs;
    }
    
    // If no analysis in database, try to get from Drive
    console.log('🔍 No resume analysis in DB, checking Drive...');
    const analysis = await getAnalysisFromDrive(resumeId);
    
    if (analysis && analysis.bestRoles) {
      console.log(`🎯 Found Drive analysis with roles: ${analysis.bestRoles.join(', ')}`);
      
      const matchingJobs = eligibleJobs.filter(job => 
        job.suitableRoles && job.suitableRoles.some(role => 
          analysis.bestRoles.includes(role)
        )
      );
      
      // Return matching jobs if any, otherwise return eligible jobs as fallback
      return matchingJobs.length > 0 ? matchingJobs : eligibleJobs;
    }
    
    // If no analysis available, return eligible jobs (fallback)
    console.log(`⚠️ No analysis found for resume ${resumeId}, showing all eligible jobs`);
    return eligibleJobs;
    
  } catch (error) {
    console.error('❌ Error in job matching:', error);
    console.error('Error stack:', error.stack);
    
    // Safe fallback - basic eligibility check
    return allJobs.filter(job => {
      // CGPA check
      if (job.minCgpa !== undefined && job.minCgpa !== null && student.cgpa < job.minCgpa) {
        return false;
      }

      // Branch check with proper "Any" handling
      if (job.branch && job.branch.trim() !== '') {
        const jobBranchClean = job.branch.trim().toLowerCase();
        
        // Skip if branch is "any"
        if (jobBranchClean === 'any') {
          return true;
        }
        
        // Handle comma-separated branches
        const jobBranches = job.branch.split(',').map(b => b.trim().toLowerCase());
        const studentBranch = student.branch ? student.branch.trim().toLowerCase() : '';
        
        if (studentBranch && !jobBranches.includes(studentBranch)) {
          return false;
        }
      }
      
      return true;
    });
  }
}

// Get jobs filtered by resume analysis
router.get('/jobs/:resumeId', authMiddleware.auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    // Verify the resume belongs to the student
    const resume = await Resume.findById(req.params.resumeId);
    if (!resume || resume.studentId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Resume not found or not authorized' });
    }
    const student = await User.findById(req.user.id);
    // Get all jobs
    const allJobs = await Job.find().populate('recruiterId', 'company name').sort({ postedAt: -1 });
    
    // Filter jobs based on resume analysis
    const matchingJobs = await getMatchingJobs(req.params.resumeId, student, allJobs);
    
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

// Apply to a job
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
    
    // ✅ START VALIDATION SECTION
    const student = await User.findById(req.user.id);
    
    // Validate CGPA requirement
    if (job.minCgpa && (!student.cgpa || student.cgpa < job.minCgpa)) {
      return res.status(400).json({ 
        msg: `Minimum CGPA required: ${job.minCgpa}. Your CGPA: ${student.cgpa || 'Not specified'}` 
      });
    }

    // Validate branch requirement
    if (job.branch && job.branch.trim() !== '' && job.branch.toLowerCase() !== 'any') {
      const jobBranches = job.branch.split(',').map(b => b.trim().toLowerCase());
      const studentBranch = student.branch ? student.branch.trim().toLowerCase() : '';
      
      if (studentBranch && !jobBranches.includes(studentBranch)) {
        return res.status(400).json({ 
          msg: `This job is only for ${job.branch} branch students. Your branch: ${student.branch || 'Not specified'}` 
        });
      }
    }
    // ✅ END VALIDATION SECTION

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
      .populate('resumeId', 'title googleDriveLink fileName')
      .populate('jobId', 'title');
    
    // Format response with proper resume URL
    const formattedApplications = applications.map(app => {
      const resume = app.resumeId;
      let resumeUrl = resume.googleDriveLink;
      
      // If it's a local storage path (starts with /api/resumes/), keep as is
      // If it's a Google Drive link from earlier, keep as is
      // Add a note if using local storage
      const storageNote = resume.googleDriveLink.startsWith('/api/resumes/') 
        ? ' (Local Storage)' 
        : ' (Google Drive)';
      
      return {
        ...app.toObject(),
        resumeUrl: resumeUrl,
        resumeFileName: resume.fileName,
        storageType: resume.googleDriveLink.startsWith('/api/resumes/') ? 'local' : 'drive'
      };
    });
    
    res.json(formattedApplications);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get my applications (student)
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

// Update application status (recruiter)
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