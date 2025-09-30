// utils/googleSheets.js
const { google } = require('googleapis');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Google Sheets API
const authClient = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SHEETS_CREDENTIALS_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

async function getSheets() {
  const auth = await authClient.getClient();
  return google.sheets({ version: 'v4', auth });
}

async function initializeSheet() {
  const sheets = await getSheets();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME;

  // Test authentication first
  let spreadsheet;
  try {
    spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    console.log('Successfully accessed Google Sheet:', spreadsheet.data.properties.title);
  } catch (err) {
    console.error('Cannot access Google Sheet. Please share it with service account:', err.message);
    throw err;
  }

  let sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
    sheet = { properties: { title: sheetName } };
  }

  // UPDATED HEADERS - Added Custom Q&A column
  const headers = [
    'Student Name', 
    'Company', 
    'Job Title', 
    'Resume Title', 
    'Applied At', 
    'Application Status', 
    'Resume Link',
    '10th Score',
    '12th Score',
    'CGPA',
    'Branch',
    'Custom Questions & Answers' // New column for all custom Q&A
  ];
  
  const range = `${sheetName}!A1:L1`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  if (!response.data.values || response.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values: [headers] },
    });
  }

  return { sheetId, sheetName };
}

// UPDATED FUNCTION - Simplified custom answers handling
async function addApplicationToSheet(
  studentName, 
  company, 
  jobTitle, 
  resumeTitle, 
  appliedAt, 
  status, 
  resumeLink,
  tenthScore,
  twelfthScore,
  cgpa,
  branch,
  customAnswers = []
) {
  try {
    const { sheetId, sheetName } = await initializeSheet();
    const sheets = await getSheets();
    
    // Format custom Q&A as a single string
    const customQnA = customAnswers.map(ca => 
      `Q: ${ca.question}\nA: ${ca.answer}`
    ).join('\n\n');
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:L`,
      valueInputOption: 'RAW',
      resource: {
        values: [[
          studentName, 
          company, 
          jobTitle, 
          resumeTitle, 
          appliedAt.toISOString(), 
          status, 
          resumeLink || '',
          tenthScore,
          twelfthScore,
          cgpa,
          branch,
          customQnA || 'None' // Store all custom Q&A in one column
        ]],
      },
    });
    console.log('Application added to Google Sheet with custom Q&A');
    return true;
  } catch (err) {
    console.error('Error adding to Google Sheet:', err);
    return false;
  }
}

async function updateApplicationStatusInSheet(applicationId, status) {
  try {
    const { sheetId, sheetName } = await initializeSheet();
    const sheets = await getSheets();
    const range = `${sheetName}!A:L`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return false;

    const rowIndex = rows.findIndex(row => row[4] === applicationId);
    if (rowIndex === -1) {
      console.error('Application not found in Google Sheet for update');
      return false;
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!F${rowIndex + 2}`,
      valueInputOption: 'RAW',
      resource: { values: [[status]] },
    });
    console.log('Application status updated in Google Sheet');
    return true;
  } catch (err) {
    console.error('Error updating status in Google Sheet:', err);
    return false;
  }
}

module.exports = { addApplicationToSheet, updateApplicationStatusInSheet };