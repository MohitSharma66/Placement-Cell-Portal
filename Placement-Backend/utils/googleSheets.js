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
    const sheets = await getSheets();
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
  let sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet3';

  console.log('📊 [DEBUG] Initializing sheet with:', {
    sheetId: sheetId,
    sheetName: sheetName,
    envSheetName: process.env.GOOGLE_SHEET_NAME
  });

  // Test authentication first
  let spreadsheet;
  try {
    spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    console.log('✅ [DEBUG] Successfully accessed Google Sheet:', spreadsheet.data.properties.title);
  } catch (err) {
    console.error('❌ [DEBUG] Cannot access Google Sheet. Please share it with service account:', err.message);
    throw err;
  }

  // Log all existing sheets for debugging
  console.log('📋 [DEBUG] Existing sheets in document:');
  let sheetFound = null;
  spreadsheet.data.sheets.forEach((s, i) => {
    const sheetInfo = `   ${i + 1}. "${s.properties.title}" (index: ${s.properties.index}, sheetId: ${s.properties.sheetId})`;
    console.log(sheetInfo);
    
    // Check if this sheet matches our target name
    if (s.properties.title === sheetName) {
      sheetFound = s;
      console.log(`   ✅ This is our target sheet!`);
    }
  });

  // Use the sheet we found, or try to find it by case-insensitive match
  let sheet = sheetFound;
  
  if (!sheet) {
    console.log(`📝 [DEBUG] Sheet "${sheetName}" not found with exact match, trying case-insensitive...`);
    
    // Try case-insensitive match
    sheet = spreadsheet.data.sheets.find(s => 
      s.properties.title.toLowerCase() === sheetName.toLowerCase()
    );
    
    if (sheet) {
      console.log(`✅ [DEBUG] Found sheet with case-insensitive match: "${sheet.properties.title}"`);
      sheetName = sheet.properties.title; // Update to actual name
    }
  }
  
  if (!sheet) {
    console.log(`📝 [DEBUG] Sheet "${sheetName}" not found, checking for sheets with "Sheet" in name...`);
    
    // Try to find any sheet that might be Sheet1, Sheet2, etc.
    const possibleSheet = spreadsheet.data.sheets.find(s => 
      s.properties.title.toLowerCase().includes('sheet')
    );
    
    if (possibleSheet) {
      console.log(`🔄 [DEBUG] Using existing sheet: "${possibleSheet.properties.title}" instead of creating new one`);
      sheetName = possibleSheet.properties.title;
      sheet = possibleSheet;
    } else {
      console.log(`📝 [DEBUG] Creating new sheet "${sheetName}"...`);
      
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [{ 
              addSheet: { 
                properties: { 
                  title: sheetName,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 20
                  }
                } 
              } 
            }],
          },
        });
        
        console.log(`✅ [DEBUG] Created new sheet: "${sheetName}"`);
        
        // Refresh spreadsheet data
        spreadsheet = await sheets.spreadsheets.get({
          spreadsheetId: sheetId,
        });
        
        sheet = spreadsheet.data.sheets.find(s => 
          s.properties.title === sheetName
        );
        
        if (!sheet) {
          throw new Error(`Failed to create sheet "${sheetName}"`);
        }
        
      } catch (createErr) {
        console.error('❌ [DEBUG] Error creating sheet:', createErr.message);
        throw createErr;
      }
    }
  } else {
    console.log(`✅ [DEBUG] Using existing sheet: "${sheet.properties.title}" (sheetId: ${sheet.properties.sheetId})`);
  }

  // UPDATED HEADERS - with "Posted By:" instead of "Company"
  const headers = [
    'Application ID', // Column A
    'Student Name',   // Column B
    'Posted By:',     // Column C  <-- CHANGED from "Company"
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
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    if (!response.data.values || response.data.values.length === 0) {
      console.log(`📝 [DEBUG] Adding headers to "${sheetName}"`);
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values: [headers] },
      });
      console.log('✅ [DEBUG] Headers added successfully');
    } else {
      console.log(`✅ [DEBUG] Headers already exist in "${sheetName}"`);
      const existingHeaders = response.data.values[0];
      console.log(`📋 [DEBUG] Current headers:`, existingHeaders);
      
      // Check if headers match (flexible comparison for "Posted By:" vs "Company")
      const headerMatches = checkHeadersMatch(existingHeaders, headers);
      
      if (!headerMatches) {
        console.log('⚠️  [DEBUG] Headers mismatch detected!');
        console.log('📋 [DEBUG] Expected headers:', headers);
        console.log('📋 [DEBUG] Actual headers:', existingHeaders);
        
        // Ask if we should update headers (in production you might want to auto-update)
        console.log('🔄 [DEBUG] Updating headers to new format...');
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range,
          valueInputOption: 'RAW',
          resource: { values: [headers] },
        });
        console.log('✅ [DEBUG] Headers updated successfully');
      } else {
        console.log('✅ [DEBUG] Headers match expected format');
      }
    }
  } catch (getErr) {
    // If range doesn't exist (empty sheet), add headers
    if (getErr.message && getErr.message.includes('Unable to parse range')) {
      console.log(`📝 [DEBUG] Sheet is empty, adding headers...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values: [headers] },
      });
      console.log('✅ [DEBUG] Headers added to empty sheet');
    } else {
      throw getErr;
    }
  }

  console.log(`🎯 [DEBUG] Sheet initialization complete. Using sheet: "${sheetName}"`);
  
  return { 
    sheetId, 
    sheetName: sheetName
  };
}

// Helper function to check if headers match (flexible for "Posted By:" vs "Company")
function checkHeadersMatch(existingHeaders, expectedHeaders) {
  if (!existingHeaders || !expectedHeaders) return false;
  if (existingHeaders.length !== expectedHeaders.length) return false;
  
  for (let i = 0; i < expectedHeaders.length; i++) {
    const expected = expectedHeaders[i].toLowerCase().trim();
    const existing = existingHeaders[i] ? existingHeaders[i].toLowerCase().trim() : '';
    
    // Special handling for column C (index 2)
    if (i === 2) {
      // Accept "posted by:", "company", or similar as equivalent
      if ((expected.includes('posted by') && existing.includes('company')) ||
          (existing.includes('posted by') && expected.includes('company')) ||
          (expected.includes('posted by') && existing.includes('posted by')) ||
          (expected.includes('company') && existing.includes('company'))) {
        continue; // Accept this as a match
      }
    }
    
    // For other columns, require exact match
    if (expected !== existing) {
      return false;
    }
  }
  
  return true;
}

// UPDATED FUNCTION - Store both applicationId and maintain compatibility
async function addApplicationToSheet(
  applicationId,
  studentName, 
  postedBy,     // Changed parameter name from "company" to "postedBy" for clarity
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
    
    console.log(`📝 [DEBUG] Adding application to sheet: "${sheetName}"`);
    console.log(`📝 [DEBUG] Posted By value: "${postedBy}"`);
    
    // Format custom Q&A as a single string
    const customQnA = customAnswers.map(ca => 
      `Q: ${ca.question}\nA: ${ca.answer}`
    ).join('\n\n');
    
    // Calculate academic year from appliedAt date
    const appliedYear = appliedAt.getFullYear();
    const academicYear = `${appliedYear}-${appliedYear + 1}`;
    
    const appendRange = `${sheetName}!A:N`;
    console.log(`📝 [DEBUG] Appending to range: ${appendRange}`);
    
    const values = [[
      applicationId,               // Column A
      studentName,                 // Column B
      postedBy,                    // Column C - Now "Posted By:"
      jobTitle,                    // Column D
      resumeTitle,                 // Column E
      appliedAt.toISOString(),     // Column F
      academicYear,                // Column G
      status,                      // Column H
      resumeLink || '',            // Column I
      tenthScore || '',            // Column J
      twelfthScore || '',          // Column K
      cgpa || '',                  // Column L
      branch || '',                // Column M
      customQnA || 'None'          // Column N
    ]];
    
    console.log(`📝 [DEBUG] Values to append:`, values[0]);
    
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: appendRange,
      valueInputOption: 'RAW',
      resource: { values },
    });
    
    console.log(`✅ [DEBUG] Application ${applicationId} added to Google Sheet "${sheetName}"`);
    console.log(`📊 [DEBUG] Updated range: ${result.data.updates.updatedRange}`);
    console.log(`📊 [DEBUG] With Academic Year: ${academicYear}`);
    
    return true;
  } catch (err) {
    console.error('❌ [DEBUG] Error adding to Google Sheet:', err.message);
    if (err.response?.data) {
      console.error('❌ [DEBUG] Error details:', JSON.stringify(err.response.data, null, 2));
    }
    return false;
  }
}

// FIXED FUNCTION - Use appliedAt timestamp to find the row
async function updateApplicationStatusInSheet(appliedAtTimestamp, status) {
  try {
    const { sheetId, sheetName } = await initializeSheet();
    const sheets = await getSheets();
    const range = `${sheetName}!A:N`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      console.log('No data rows found in sheet');
      return false;
    }

    console.log(`🔍 [DEBUG] Looking for application with Applied At: ${appliedAtTimestamp}`);
    console.log(`📊 [DEBUG] Total rows in data: ${rows.length}`);
    console.log(`📝 [DEBUG] Sheet name: "${sheetName}"`);
    
    // Find the row by Applied At timestamp (column F, index 5)
    const rowIndex = rows.findIndex((row, index) => {
      if (index === 0) return false; // Skip header row
      
      const rowAppliedAt = row[5]; // Column F - Applied At (index 5)
      
      // Check if Applied At matches
      const match = rowAppliedAt === appliedAtTimestamp;
      if (match) {
        console.log(`✅ [DEBUG] Found matching application at row ${index}`);
      }
      return match;
    });

    if (rowIndex === -1) {
      console.error(`❌ [DEBUG] Application with Applied At ${appliedAtTimestamp} not found in Google Sheet`);
      return false;
    }

    // CORRECTED: Status is now in column H (index 7) - Application Status
    const googleSheetsRowNumber = rowIndex + 1;
    const updateRange = `${sheetName}!H${googleSheetsRowNumber}`;
    
    console.log(`📝 [DEBUG] JavaScript array index: ${rowIndex}`);
    console.log(`📝 [DEBUG] Google Sheets row number: ${googleSheetsRowNumber}`);
    console.log(`🔄 [DEBUG] Updating range ${updateRange} to status: ${status}`);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: { values: [[status]] },
    });
    
    console.log(`✅ [DEBUG] Application status updated to: ${status}`);
    return true;
  } catch (err) {
    console.error('❌ [DEBUG] Error updating status in Google Sheet:', err.message);
    if (err.response?.data) {
      console.error('❌ [DEBUG] Error details:', JSON.stringify(err.response.data, null, 2));
    }
    return false;
  }
}

module.exports = { addApplicationToSheet, updateApplicationStatusInSheet, getSheetData, getSheets };