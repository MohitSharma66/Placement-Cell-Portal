// routes/students.js
const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Resume = require('../models/Resume');
const { getAuthUrl, setToken, uploadResumeToDrive, loadToken } = require('../utils/driveOAuth');
const multer = require('multer');
const router = express.Router();
const ResumeAnalyzer = require('../utils/resumeAnalyzer');
const PDFParser = require('../utils/pdfParser');
const { saveAnalysisToDrive } = require('../utils/driveOAuth'); // ADD THIS

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedMimes = ['application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
    }
  }
});

// OAuth 2.0 Authentication Routes
router.get('/auth/google', (req, res) => {
  getAuthUrl().then(url => res.json({ authUrl: url })).catch(err => {
    console.error('Error in getAuthUrl:', err);
    res.status(500).send('Internal server error: ' + err.message);
  });
});

router.get('/auth/callback', async (req, res) => {
  if (!req.query.code) {
    return res.status(400).json({ msg: 'No authorization code provided' });
  }
  try {
    await setToken(req.query.code);
    res.json({ msg: 'Authentication successful!' });
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ msg: 'Authentication failed: ' + err.message });
  }
});

// Check authentication status
router.get('/auth/status', async (req, res) => {
  await loadToken();
  const { oauth2Client } = require('../utils/driveOAuth');
  if (oauth2Client.credentials && oauth2Client.credentials.access_token) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
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
        cgpa: parseFloat(cgpa), 
        branch,
        tenthScore: parseFloat(tenthScore),
        twelfthScore: parseFloat(twelfthScore)
      }, 
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Upload resume
// Upload resume - UPDATED WITH RESUME ANALYSIS
router.post('/resumes', auth, upload.single('resume'), async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Access denied' });

  try {
    const { title } = req.body;
    if (!req.file || !title) return res.status(400).json({ msg: 'Resume file and title are required' });

    const user = await User.findById(req.user.id);
    const uploadResult = await uploadResumeToDrive(req.file.buffer, req.file.originalname, req.user.id, user.name);
    if (!uploadResult.success) {
      return res.status(500).json({ msg: 'Failed to upload resume to Google Drive' });
    }

    const resume = new Resume({
      studentId: req.user.id,
      googleDriveLink: uploadResult.link,
      title,
    });

    await resume.save();

    // RESUME ANALYSIS - ADD THIS SECTION
    try {
      const pdfParser = new PDFParser();
      const resumeAnalyzer = new ResumeAnalyzer();
      
      // Extract text from PDF
      const resumeText = await pdfParser.extractText(req.file.buffer);
      
      // Analyze resume
      const analysis = await resumeAnalyzer.analyze(resumeText);
      
      // Save analysis to Drive
      await saveAnalysisToDrive(resume._id.toString(), analysis);
      
      // Also save analysis in database for quick access
      resume.skillAnalysis = analysis;
      await resume.save();
      
      console.log(`Resume analysis completed for: ${title}`);
    } catch (analysisError) {
      console.error('Resume analysis failed (non-critical):', analysisError);
      // Don't fail the upload if analysis fails
    }

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