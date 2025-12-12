const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Configuration for local storage
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/resumes';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`📁 Created upload directory: ${UPLOAD_DIR}`);
}

// Save resume to local server storage
async function uploadResumeToLocal(fileBuffer, fileName, studentId, studentName, branch = 'Unknown') {
  try {
    // Generate folder path based on academic year and branch
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    
    // Create folder structure: AcademicYear/Branch/StudentName_Id/
    const yearPath = path.join(UPLOAD_DIR, academicYear);
    const branchPath = path.join(yearPath, branch);
    const studentPath = path.join(branchPath, `${studentName}_${studentId}`);
    
    // Create directories if they don't exist
    [yearPath, branchPath, studentPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Clean filename
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalFileName = `${studentName}_Resume_${cleanFileName}`;
    const filePath = path.join(studentPath, finalFileName);
    
    // Save file to disk
    fs.writeFileSync(filePath, fileBuffer);
    
    console.log(`✅ Resume saved locally for ${studentName}: ${finalFileName}`);
    console.log(`📁 Location: ${filePath}`);
    
    // Generate URL path for recruiter access
    const relativePath = path.relative(UPLOAD_DIR, filePath);
    const fileUrl = `/api/resumes/${encodeURIComponent(relativePath)}`;
    
    return {
      success: true,
      filePath: filePath,
      fileName: finalFileName,
      viewLink: fileUrl,
      downloadLink: fileUrl,
      folderPath: `${academicYear}/${branch}/${studentName}_${studentId}`,
      storageType: 'local'
    };
    
  } catch (error) {
    console.error('❌ Error saving resume locally:', error.message);
    throw new Error(`Failed to save resume: ${error.message}`);
  }
}

// Helper: Get MIME type from filename
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Create analysis folder (local version)
async function createAnalysisFolder() {
  try {
    const analysisPath = path.join(UPLOAD_DIR, 'Resume-Analysis');
    if (!fs.existsSync(analysisPath)) {
      fs.mkdirSync(analysisPath, { recursive: true });
      console.log('✅ Created analysis folder:', analysisPath);
    }
    return analysisPath;
  } catch (error) {
    console.error('❌ Error creating analysis folder:', error.message);
    throw error;
  }
}

// Save analysis JSON locally
async function saveAnalysisToLocal(resumeId, analysis) {
  try {
    const analysisPath = await createAnalysisFolder();
    const filePath = path.join(analysisPath, `resume-${resumeId}-analysis.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(analysis, null, 2));
    
    console.log(`✅ Analysis saved locally for resume ${resumeId}`);
    return {
      success: true,
      filePath: filePath,
      link: `/api/resumes/Resume-Analysis/resume-${resumeId}-analysis.json`
    };
  } catch (error) {
    console.error('❌ Error saving analysis:', error.message);
    return { success: false, error: error.message };
  }
}

// Get analysis from local storage
async function getAnalysisFromLocal(resumeId) {
  try {
    const analysisPath = path.join(UPLOAD_DIR, 'Resume-Analysis');
    const filePath = path.join(analysisPath, `resume-${resumeId}-analysis.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error getting analysis:', error.message);
    return null;
  }
}

// Test local storage connection
async function testLocalStorageConnection() {
  try {
    // Check if we can write to upload directory
    const testFile = path.join(UPLOAD_DIR, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    console.log(`✅ Local storage accessible: ${UPLOAD_DIR}`);
    return { 
      success: true, 
      storageType: 'local',
      uploadDir: UPLOAD_DIR 
    };
  } catch (error) {
    console.error('❌ Failed to access local storage:', error.message);
    return { success: false, error: error.message };
  }
}

// Helper function to serve files to recruiters
function serveResumeFile(req, res) {
  try {
    // Decode the file path from URL
    const encodedPath = req.params[0] || '';
    const filePath = decodeURIComponent(encodedPath);
    const fullPath = path.join(UPLOAD_DIR, filePath);
    
    // Security check: prevent directory traversal
    const resolvedPath = path.resolve(fullPath);
    const uploadDirResolved = path.resolve(UPLOAD_DIR);
    
    if (!resolvedPath.startsWith(uploadDirResolved)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Set appropriate headers
    const mimeType = getMimeType(fullPath);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Error serving file:', error.message);
    res.status(500).json({ error: 'Failed to serve file' });
  }
}

module.exports = { 
  uploadResumeToDrive: uploadResumeToLocal, // Keep same function name for compatibility
  createAnalysisFolder, 
  saveAnalysisToDrive: saveAnalysisToLocal, // Keep same function name
  getAnalysisFromDrive: getAnalysisFromLocal, // Keep same function name
  testDriveConnection: testLocalStorageConnection, // Keep same function name
  serveResumeFile, // New function for serving files
  getMimeType // Export for use in routes
};