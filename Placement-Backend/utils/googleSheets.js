const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

async function uploadResumeToDrive(fileBuffer, fileName, studentId, studentName) {
  try {
    const auth = await new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SHEETS_CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/drive'],
    }).getClient();

    const drive = google.drive({ version: 'v3', auth });

    // Define file metadata
    const fileMetadata = {
      name: `${studentName}_${studentId}_${fileName}`,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    };

    // Upload file
    const media = {
      mimeType: 'application/pdf',
      body: fileBuffer,
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });

    // Set permissions to make file viewable by anyone with the link
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Generate shareable link
    const result = await drive.files.get({
      fileId: file.data.id,
      fields: 'webViewLink',
    });

    return { success: true, link: result.data.webViewLink };
  } catch (err) {
    console.error('Error uploading to Google Drive:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { uploadResumeToDrive };