const { google } = require('googleapis');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Google Sheets API
const authClient = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SHEETS_CREDENTIALS_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

// Add this function to read sheet data for statistics
async function getSheetData(sheetId, range) {
  try {
    const sheets = await getSheets(); // This now works
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });
    return response.data.values || [];
  } catch (err) {
    console.error('Error reading sheet data:', err);
    throw err;
  }
}

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
    'Academic Year',  // Column G
    'Application Status', // Column H
    'Resume Link',    // Column I
    '10th Score',     // Column J
    '12th Score',     // Column K
    'CGPA',           // Column L
    'Branch',         // Column M
    'Custom Questions & Answers' // Column N
  ];

  const range = `${sheetName}!A1:N1`;
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
    
    // Calculate academic year from appliedAt date
    // Format: YYYY-YYYY+1 (e.g., 2025-2026 for appliedAt in 2025)
    const appliedYear = appliedAt.getFullYear();
    const academicYear = `${appliedYear}-${appliedYear + 1}`;
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:N`,  // Changed from A:M to A:N
      valueInputOption: 'RAW',
      resource: {
        values: [[
          applicationId,               // Column A
          studentName,                 // Column B
          company,                     // Column C
          jobTitle,                    // Column D
          resumeTitle,                 // Column E
          appliedAt.toISOString(),     // Column F
          academicYear,                // Column G  <-- NEW: Academic Year
          status,                      // Column H
          resumeLink || '',            // Column I
          tenthScore,                  // Column J
          twelfthScore,                // Column K
          cgpa,                        // Column L
          branch,                      // Column M
          customQnA || 'None'          // Column N
        ]],
      },
    });
    console.log(`Application ${applicationId} added to Google Sheet with Academic Year: ${academicYear}`);
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
    const range = `${sheetName}!A:N`;  // Changed from A:M to A:N
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

    // CORRECTED: Status is now in column H (index 7) - Application Status
    const googleSheetsRowNumber = rowIndex + 1;
    const updateRange = `${sheetName}!H${googleSheetsRowNumber}`;  // Changed from G to H
    
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

module.exports = { addApplicationToSheet, updateApplicationStatusInSheet, getSheetData, getSheets };