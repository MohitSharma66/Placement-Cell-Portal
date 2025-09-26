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

async function loadToken() {
  if (fs.existsSync('token.json')) {
    const tokens = JSON.parse(fs.readFileSync('token.json'));
    oauth2Client.setCredentials(tokens);
    accessToken = tokens.access_token;
    const now = Date.now();
    if (tokens.expiry_date && tokens.expiry_date < now) {
      await oauth2Client.refreshAccessToken();
      const newTokens = oauth2Client.credentials;
      accessToken = newTokens.access_token;
      fs.writeFileSync('token.json', JSON.stringify(newTokens));
      console.log('Token refreshed:', newTokens);
    } else {
      console.log('Token still valid, no refresh needed');
    }
  }
}

async function getAuthUrl() {
  console.log('Generating auth URL with redirect URI:', process.env.GOOGLE_REDIRECT_URI);
  await loadToken();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });
  console.log('Generated auth URL:', authUrl);
  return authUrl;
}

async function setToken(code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  accessToken = tokens.access_token;
  fs.writeFileSync('token.json', JSON.stringify(tokens));
  return tokens;
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
    parents: ['root'], // Upload to root; adjust if using a specific folder
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

module.exports = { getAuthUrl, setToken, uploadResumeToDrive, loadToken, oauth2Client };