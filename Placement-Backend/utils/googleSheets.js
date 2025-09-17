const { google } = require('googleapis');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Google Sheets API
const authClient = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SHEETS_CREDENTIALS_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getSheets() {
  const auth = await authClient.getClient();
  return google.sheets({ version: 'v4', auth });
}

async function initializeSheet() {
  const sheets = await getSheets();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME;

  // Get sheet metadata
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
  });

  // Check if sheet (tab) exists
  let sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) {
    // Create new sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
    sheet = { properties: { title: sheetName } };
  }

  // Check headers
  const headers = ['Student Name', 'Company', 'Job Title', 'Resume Title', 'Applied At', 'Application Status', 'Resume Link'];
  const range = `${sheetName}!A1:G1`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  if (!response.data.values || response.data.values.length === 0) {
    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values: [headers] },
    });
  }

  return { sheetId, sheetName };
}

async function addApplicationToSheet(studentName, company, jobTitle, resumeTitle, appliedAt, status, resumeLink) {
  try {
    const { sheetId, sheetName } = await initializeSheet();
    const sheets = await getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:G`,
      valueInputOption: 'RAW',
      resource: {
        values: [[studentName, company, jobTitle, resumeTitle, appliedAt.toISOString(), status, resumeLink]],
      },
    });
    console.log('Application added to Google Sheet');
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
    const range = `${sheetName}!A:G`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return false; // No data rows

    const rowIndex = rows.findIndex(row => row[4] === applicationId); // Applied At in column E
    if (rowIndex === -1) {
      console.error('Application not found in Google Sheet for update');
      return false;
    }

    // Update status in column F (Application Status)
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!F${rowIndex + 1}`,
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
