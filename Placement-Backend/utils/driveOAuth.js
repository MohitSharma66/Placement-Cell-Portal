const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const dotenv = require('dotenv');
const { Readable } = require('stream');

dotenv.config();

const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

let accessToken;

// MODIFIED: Handle initial setup gracefully
async function loadToken() {
  if (fs.existsSync('token.json')) {
    const tokens = JSON.parse(fs.readFileSync('token.json'));
    oauth2Client.setCredentials(tokens);
    accessToken = tokens.access_token;
    
    const now = Date.now();
    if (tokens.expiry_date && tokens.expiry_date < now) {
      try {
        // Only refresh if we have a refresh token
        if (tokens.refresh_token) {
          await oauth2Client.refreshAccessToken();
          const newTokens = oauth2Client.credentials;
          accessToken = newTokens.access_token;
          fs.writeFileSync('token.json', JSON.stringify(newTokens));
          console.log('✅ Token refreshed');
        } else {
          console.log('⚠️ No refresh token available - user needs to reauthorize');
        }
      } catch (refreshErr) {
        console.error('❌ Token refresh failed:', refreshErr.message);
        // Don't throw - allow user to reauthorize
      }
    } else {
      console.log('✅ Token still valid');
    }
  } else {
    // First-time setup - no token.json exists
    console.log('📝 No token.json found. First-time setup required.');
  }
}

// MODIFIED: Don't call loadToken() on initial auth URL generation
async function getAuthUrl() {
  console.log('Generating auth URL with redirect URI:', process.env.GOOGLE_REDIRECT_URI);
  
  // CRITICAL FIX: Don't call loadToken() here on initial setup
  // Only call it if we're already authenticated and need to refresh
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent' // ADD THIS: Ensures refresh token on first authorization
  });
  
  console.log('✅ Generated auth URL');
  return authUrl;
}

async function setToken(code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  accessToken = tokens.access_token;
  fs.writeFileSync('token.json', JSON.stringify(tokens));
  console.log('✅ Token saved to token.json');
  return tokens;
}

// ADD THIS: Check if OAuth is initialized
function isOAuthInitialized() {
  return fs.existsSync('token.json');
}

// MODIFIED: Get Drive Service - handle unauthenticated state
async function getDriveService() {
  if (!isOAuthInitialized()) {
    throw new Error('OAuth not initialized. Please authenticate first via /auth/google');
  }
  
  await loadToken();
  
  if (!accessToken) {
    throw new Error('No access token. Please re-authenticate.');
  }
  
  const drive = require('@googleapis/drive').drive({
    version: 'v3',
    auth: oauth2Client,
  });
  
  return { drive };
}

async function uploadResumeToDrive(fileBuffer, fileName, studentId, studentName) {
  await loadToken();
  if (!accessToken) {
    throw new Error('No access token. Please authenticate first.');
  }
  console.log('Uploading file:', fileName, 'for', studentName, 'with token:', accessToken.substring(0, 10) + '...');
  const drive = require('@googleapis/drive').drive({
    version: 'v3',
    auth: oauth2Client,
  });

  const fileMetadata = {
    name: `${studentName}_${studentId}_${fileName}`,
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || 'root'], // Use folder ID or root as fallback
  };

  const bufferStream = new Readable();
  bufferStream.push(fileBuffer);
  bufferStream.push(null);

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType: 'application/pdf',
      body: bufferStream,
    },
    fields: 'id, webViewLink',
  });

  return {
    success: true,
    link: response.data.webViewLink,
  };
}

// Create analysis folder if it doesn't exist
async function createAnalysisFolder() {
  try {
    const { drive } = await getDriveService();
    
    // Check if folder already exists
    const query = `name='Resume-Analysis' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)'
    });

    if (response.data.files.length > 0) {
      console.log('Analysis folder already exists:', response.data.files[0].id);
      return response.data.files[0].id;
    }

    // Create new folder
    const folderMetadata = {
      name: 'Resume-Analysis',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] // Parent folder where resumes are stored
    };

    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id'
    });

    console.log('Created analysis folder:', folder.data.id);
    return folder.data.id;
  } catch (error) {
    console.error('Error creating analysis folder:', error);
    throw error;
  }
}

// Save analysis JSON to Drive
async function saveAnalysisToDrive(resumeId, analysis) {
  try {
    const { drive } = await getDriveService();
    
    // Ensure analysis folder exists
    const analysisFolderId = await createAnalysisFolder();
    
    const fileMetadata = {
      name: `resume-${resumeId}-analysis.json`,
      parents: [analysisFolderId],
      mimeType: 'application/json'
    };
    
    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(analysis, null, 2)
    };
    
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });
    
    console.log(`Analysis saved for resume ${resumeId}: ${file.data.id}`);
    return {
      success: true,
      fileId: file.data.id,
      link: file.data.webViewLink
    };
  } catch (error) {
    console.error('Error saving analysis to Drive:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get analysis from Drive by resume ID
async function getAnalysisFromDrive(resumeId) {
  try {
    const { drive } = await getDriveService();
    const analysisFolderId = await createAnalysisFolder();
    
    const query = `name='resume-${resumeId}-analysis.json' and '${analysisFolderId}' in parents and trashed=false`;
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)'
    });

    if (response.data.files.length === 0) {
      return null;
    }

    const fileId = response.data.files[0].id;
    const file = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    });

    return JSON.parse(file.data);
  } catch (error) {
    console.error('Error getting analysis from Drive:', error);
    return null;
  }
}

module.exports = { 
  getAuthUrl, 
  setToken, 
  uploadResumeToDrive, 
  loadToken, 
  oauth2Client, 
  createAnalysisFolder, 
  saveAnalysisToDrive, 
  getAnalysisFromDrive,
  getDriveService // ADD THIS EXPORT
};