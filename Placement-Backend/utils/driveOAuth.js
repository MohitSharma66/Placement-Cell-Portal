const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Google Auth with Service Account
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SHEETS_CREDENTIALS_PATH, // Path to your service account JSON
  scopes: ['https://www.googleapis.com/auth/drive']
});

// Global Drive instance
let driveService = null;

// Initialize Drive Service
async function getDriveService() {
  if (!driveService) {
    const authClient = await auth.getClient();
    driveService = google.drive({
      version: 'v3',
      auth: authClient
    });
    console.log('✅ Drive service initialized with service account');
  }
  return driveService;
}

// Upload resume directly to Shared Drive
async function uploadResumeToDrive(fileBuffer, fileName, studentId, studentName, branch = 'Unknown') {
  try {
    const drive = await getDriveService();
    
    // Generate folder path based on academic year and branch
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    
    // Create folder structure: SharedDrive/AcademicYear/Branch/StudentName_Id/
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const yearFolderId = await getOrCreateFolder(drive, academicYear, rootFolderId);
    const branchFolderId = await getOrCreateFolder(drive, branch, yearFolderId);
    const studentFolderId = await getOrCreateFolder(drive, `${studentName}_${studentId}`, branchFolderId);
    
    // Clean filename
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalFileName = `${studentName}_Resume_${cleanFileName}`;
    
    // Prepare file metadata
    const fileMetadata = {
      name: finalFileName,
      parents: [studentFolderId],
      supportsAllDrives: true  // IMPORTANT for Shared Drives
    };

    // Convert buffer to stream
    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);

    // Upload file
    const response = await drive.files.create({
      resource: fileMetadata,
      media: {
        mimeType: getMimeType(fileName),
        body: bufferStream,
      },
      supportsAllDrives: true,  // IMPORTANT for Shared Drives
      fields: 'id, name, webViewLink, webContentLink',
    });

    console.log(`✅ Resume uploaded for ${studentName}: ${response.data.name}`);
    
    return {
      success: true,
      fileId: response.data.id,
      fileName: response.data.name,
      viewLink: response.data.webViewLink,
      downloadLink: response.data.webContentLink,
      folderPath: `${academicYear}/${branch}/${studentName}_${studentId}`
    };
    
  } catch (error) {
    console.error('❌ Error uploading resume to Shared Drive:', error.message);
    throw new Error(`Failed to upload resume: ${error.message}`);
  }
}

// Helper: Get or create folder in Shared Drive
async function getOrCreateFolder(drive, folderName, parentFolderId) {
  try {
    // Search for existing folder
    const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`;
    const response = await drive.files.list({
      q: query,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name)',
      corpora: 'drive',
      driveId: process.env.GOOGLE_DRIVE_FOLDER_ID
    });

    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create new folder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
      supportsAllDrives: true
    };

    const folder = await drive.files.create({
      resource: folderMetadata,
      supportsAllDrives: true,
      fields: 'id'
    });

    console.log(`📁 Created folder: ${folderName}`);
    return folder.data.id;
    
  } catch (error) {
    console.error(`❌ Error creating folder ${folderName}:`, error.message);
    throw error;
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

// Create analysis folder (kept for compatibility)
async function createAnalysisFolder() {
  try {
    const drive = await getDriveService();
    const sharedDriveId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    const folderMetadata = {
      name: 'Resume-Analysis',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [sharedDriveId],
      supportsAllDrives: true
    };

    const folder = await drive.files.create({
      resource: folderMetadata,
      supportsAllDrives: true,
      fields: 'id'
    });

    console.log('✅ Created analysis folder:', folder.data.id);
    return folder.data.id;
    
  } catch (error) {
    console.error('❌ Error creating analysis folder:', error.message);
    throw error;
  }
}

// Save analysis JSON to Drive (simplified version)
async function saveAnalysisToDrive(resumeId, analysis) {
  try {
    const drive = await getDriveService();
    const analysisFolderId = await createAnalysisFolder();
    
    const fileMetadata = {
      name: `resume-${resumeId}-analysis.json`,
      parents: [analysisFolderId],
      supportsAllDrives: true
    };
    
    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(analysis, null, 2)
    };
    
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      supportsAllDrives: true,
      fields: 'id, webViewLink'
    });
    
    console.log(`✅ Analysis saved for resume ${resumeId}`);
    return {
      success: true,
      fileId: file.data.id,
      link: file.data.webViewLink
    };
  } catch (error) {
    console.error('❌ Error saving analysis:', error.message);
    return { success: false, error: error.message };
  }
}

// Get analysis from Drive (simplified version)
async function getAnalysisFromDrive(resumeId) {
  try {
    const drive = await getDriveService();
    const sharedDriveId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    const query = `name='resume-${resumeId}-analysis.json' and '${sharedDriveId}' in parents and trashed=false`;
    const response = await drive.files.list({
      q: query,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name)',
      corpora: 'drive',
      driveId: sharedDriveId
    });

    if (response.data.files.length === 0) {
      return null;
    }

    const fileId = response.data.files[0].id;
    const file = await drive.files.get({
      fileId: fileId,
      alt: 'media',
      supportsAllDrives: true
    });

    return JSON.parse(file.data);
  } catch (error) {
    console.error('❌ Error getting analysis:', error.message);
    return null;
  }
}

// Test connection to Shared Drive
async function testDriveConnection() {
  try {
    const drive = await getDriveService();
    const sharedDriveId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    const response = await drive.drives.get({
      driveId: sharedDriveId
    });
    
    console.log(`✅ Connected to Shared Drive: ${response.data.name}`);
    return { success: true, driveName: response.data.name };
  } catch (error) {
    console.error('❌ Failed to connect to Shared Drive:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { 
  uploadResumeToDrive,
  createAnalysisFolder, 
  saveAnalysisToDrive, 
  getAnalysisFromDrive,
  getDriveService,
  testDriveConnection
};