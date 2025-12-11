// routes/students.js
const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Resume = require('../models/Resume');
const { uploadResumeToDrive, getDriveService, testDriveConnection } = require('../utils/driveOAuth'); // Updated imports
const multer = require('multer');
const router = express.Router();
const ResumeAnalyzer = require('../utils/resumeAnalyzer');
const PDFParser = require('../utils/pdfParser');
const { saveAnalysisToDrive } = require('../utils/driveOAuth');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
    }
  }
});

// Test Shared Drive connection (for debugging)
router.get('/test-drive', auth, async (req, res) => {
  try {
    const result = await testDriveConnection();
    res.json(result);
  } catch (err) {
    console.error('Drive test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get profile
router.get('/profile', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });
  res.json(req.user);
});

// Update profile - UPDATED WITH NEW FIELDS
router.put('/profile', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    const { cgpa, branch, tenthScore, twelfthScore } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { 
        cgpa: parseFloat(cgpa) || null, 
        branch: branch || '',
        tenthScore: parseFloat(tenthScore) || null,
        twelfthScore: parseFloat(twelfthScore) || null
      }, 
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Upload resume - SIMPLIFIED VERSION (NO OAuth for users)
router.post('/upload-resume', auth, upload.single('resume'), async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  if (!req.file) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }

  try {
    const student = await User.findById(req.user.id);
    
    // Get title from request or use default
    const title = req.body.title || `${student.name}'s Resume`;
    
    // Upload to Shared Drive using service account
    const uploadResult = await uploadResumeToDrive(
      req.file.buffer,
      req.file.originalname,
      student._id.toString(),
      student.name,
      student.branch || 'General'
    );

    if (!uploadResult.success) {
      return res.status(500).json({ 
        msg: 'Failed to upload resume to Shared Drive',
        error: uploadResult.error 
      });
    }

    // Create resume record in database
    const resume = new Resume({
      studentId: student._id,
      title: title,
      fileName: req.file.originalname,
      googleDriveLink: uploadResult.viewLink,
      fileId: uploadResult.fileId,
      folderPath: uploadResult.folderPath,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedAt: new Date()
    });

    // RESUME ANALYSIS - ADD THIS SECTION
    try {
      const pdfParser = new PDFParser();
      const resumeAnalyzer = new ResumeAnalyzer();
      
      // Extract text from PDF (only if PDF)
      let resumeText = '';
      if (req.file.mimetype === 'application/pdf') {
        resumeText = await pdfParser.extractText(req.file.buffer);
      } else {
        // For DOC/DOCX, you might need different parsing
        resumeText = `[Text extraction not available for ${req.file.mimetype} files]`;
      }
      
      // Analyze resume
      const analysis = await resumeAnalyzer.analyze(resumeText);
      
      // Save analysis to Drive
      await saveAnalysisToDrive(resume._id.toString(), analysis);
      
      // Also save analysis in database for quick access
      resume.skillAnalysis = analysis;
      
      console.log(`✅ Resume analysis completed for: ${student.name}`);
    } catch (analysisError) {
      console.error('⚠️ Resume analysis failed (non-critical):', analysisError.message);
      // Don't fail the upload if analysis fails
    }

    await resume.save();

    res.json({
      success: true,
      message: 'Resume uploaded successfully to Shared Drive',
      resume: {
        id: resume._id,
        title: resume.title,
        fileName: resume.fileName,
        viewLink: resume.googleDriveLink,
        folderPath: resume.folderPath,
        uploadedAt: resume.uploadedAt,
        analysis: resume.skillAnalysis || null
      }
    });

  } catch (error) {
    console.error('❌ Resume upload error:', error);
    res.status(500).json({ 
      msg: 'Failed to upload resume',
      error: error.message 
    });
  }
});

// Get all resumes for the student
router.get('/resumes', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    const resumes = await Resume.find({ studentId: req.user.id })
      .sort({ uploadedAt: -1 })
      .select('_id title fileName googleDriveLink folderPath uploadedAt skillAnalysis');
    
    res.json(resumes);
  } catch (err) {
    console.error('❌ Error fetching resumes:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get single resume by ID
router.get('/resumes/:id', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    const resume = await Resume.findOne({ 
      _id: req.params.id, 
      studentId: req.user.id 
    });
    
    if (!resume) {
      return res.status(404).json({ msg: 'Resume not found' });
    }
    
    res.json(resume);
  } catch (err) {
    console.error('❌ Error fetching resume:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete resume
router.delete('/resumes/:id', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    const resume = await Resume.findOne({ 
      _id: req.params.id, 
      studentId: req.user.id 
    });
    
    if (!resume) {
      return res.status(404).json({ msg: 'Resume not found' });
    }
    
    // TODO: Optionally delete from Google Drive too
    await resume.deleteOne();
    
    res.json({ 
      success: true, 
      message: 'Resume deleted successfully' 
    });
  } catch (err) {
    console.error('❌ Error deleting resume:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get resume analysis
router.get('/resumes/:id/analysis', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    const resume = await Resume.findOne({ 
      _id: req.params.id, 
      studentId: req.user.id 
    }).select('skillAnalysis');
    
    if (!resume) {
      return res.status(404).json({ msg: 'Resume not found' });
    }
    
    res.json({
      analysis: resume.skillAnalysis || {},
      hasAnalysis: !!resume.skillAnalysis
    });
  } catch (err) {
    console.error('❌ Error fetching analysis:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;