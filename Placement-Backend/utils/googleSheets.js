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

  // UPDATED HEADERS - Keep Application ID but maintain compatibility
  const headers = [
    'Application ID', // Column A
    'Student Name',   // Column B
    'Company',        // Column C
    'Job Title',      // Column D
    'Resume Title',   // Column E
    'Applied At',     // Column F
    'Application Status', // Column G
    'Resume Link',    // Column H
    '10th Score',     // Column I
    '12th Score',     // Column J
    'CGPA',           // Column K
    'Branch',         // Column L
    'Custom Questions & Answers' // Column M
  ];
  
  const range = `${sheetName}!A1:M1`;
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
    console.log('Created new sheet with updated headers');
  }

  return { sheetId, sheetName };
}

// UPDATED FUNCTION - Store both applicationId and maintain compatibility
async function addApplicationToSheet(
  applicationId,
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
      range: `${sheetName}!A:M`,
      valueInputOption: 'RAW',
      resource: {
        values: [[
          applicationId,        // Column A - Application ID
          studentName,          // Column B - Student Name
          company,              // Column C - Company
          jobTitle,             // Column D - Job Title
          resumeTitle,          // Column E - Resume Title
          appliedAt.toISOString(), // Column F - Applied At
          status,               // Column G - Application Status
          resumeLink || '',     // Column H - Resume Link
          tenthScore,           // Column I - 10th Score
          twelfthScore,         // Column J - 12th Score
          cgpa,                 // Column K - CGPA
          branch,               // Column L - Branch
          customQnA || 'None'   // Column M - Custom Q&A
        ]],
      },
    });
    console.log(`Application ${applicationId} added to Google Sheet`);
    return true;
  } catch (err) {
    console.error('Error adding to Google Sheet:', err);
    return false;
  }
}

// FIXED FUNCTION - Use appliedAt timestamp to find the row (like the old working version)
// FIXED FUNCTION - Correct indexing
async function updateApplicationStatusInSheet(appliedAtTimestamp, status) {
  try {
    const { sheetId, sheetName } = await initializeSheet();
    const sheets = await getSheets();
    const range = `${sheetName}!A:M`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      console.log('No data rows found in sheet');
      return false;
    }

    console.log(`🔍 Looking for application with Applied At: ${appliedAtTimestamp}`);
    console.log(`📊 Total rows in data: ${rows.length}`);
    
    // Find the row by Applied At timestamp (column F, index 5)
    const rowIndex = rows.findIndex((row, index) => {
      if (index === 0) return false; // Skip header row
      
      const rowAppliedAt = row[5]; // Column F - Applied At (index 5)
      console.log(`Row ${index}: Applied At = "${rowAppliedAt}"`);
      
      // Check if Applied At matches
      const match = rowAppliedAt === appliedAtTimestamp;
      if (match) {
        console.log(`✅ Found matching application at JavaScript array index ${index}`);
      }
      return match;
    });

    if (rowIndex === -1) {
      console.error(`❌ Application with Applied At ${appliedAtTimestamp} not found in Google Sheet`);
      return false;
    }

    // CORRECTED: Status is in column G (index 6) - Application Status
    // rowIndex + 1 because: 
    // - JavaScript array index 1 = Google Sheets row 2 (first data row)
    // - JavaScript array index 2 = Google Sheets row 3 (second data row)
    const googleSheetsRowNumber = rowIndex + 1;
    const updateRange = `${sheetName}!G${googleSheetsRowNumber}`;
    
    console.log(`📝 JavaScript array index: ${rowIndex}`);
    console.log(`📝 Google Sheets row number: ${googleSheetsRowNumber}`);
    console.log(`🔄 Updating range ${updateRange} to status: ${status}`);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: { values: [[status]] },
    });
    
    console.log(`✅ Application status updated to: ${status}`);
    return true;
  } catch (err) {
    console.error('❌ Error updating status in Google Sheet:', err);
    return false;
  }
}

module.exports = { addApplicationToSheet, updateApplicationStatusInSheet };