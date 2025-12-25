const express = require('express');
const { auth } = require('../middleware/auth');
const { getSheetData } = require('../utils/googleSheets'); // Assuming you have this
const router = express.Router();

// Get placement statistics from Google Sheets
router.get('/placements/stats', auth, async (req, res) => {
    if (req.user.role !== 'recruiter') {
        return res.status(403).json({ msg: 'Access denied' });
    }

    try {
        console.log('📡 Fetching placement stats...');
        console.log('📋 Sheet ID:', process.env.GOOGLE_SHEET_ID);
        
        // Fetch data from your placements sheet
        const sheetData = await getSheetData(
            process.env.GOOGLE_SHEET_ID,
            'Sheet3!A:N' // Read all columns from A to N
        );

        console.log(`📄 Raw sheet data received: ${sheetData.length} rows`);
        if (sheetData.length > 0) {
            console.log('📝 Headers:', sheetData[0]);
        }

        // Process the data
        const processedData = processPlacementData(sheetData);
        
        res.json({
            success: true,
            data: processedData,
            totalRows: sheetData.length
        });
    } catch (error) {
        console.error('❌ Error fetching placement stats:', error);
        res.status(500).json({ 
            msg: 'Failed to fetch placement statistics',
            error: error.message 
        });
    }
});

// Helper function to process sheet data
function processPlacementData(sheetData) {
  // sheetData is already an array, not an object with .values property
  if (!sheetData || sheetData.length === 0) {
    return {};
  }
  
  const rows = sheetData.slice(1); // Skip header row (CHANGED from .values.slice(1))
  const statsByYear = {};
  
  console.log(`📊 Processing ${rows.length} data rows...`);
  
  rows.forEach((row, index) => {
    // Debug log for first few rows
    if (index < 3) {
      console.log(`Row ${index + 1}:`, row);
    }
    
    // Column H (index 7) is "Application Status" (changed from G to H due to Academic Year column)
    const status = row[7] || '';
    if (status.toLowerCase() === 'accepted' || status.toLowerCase() === 'placed') {
      // Column G (index 6) is "Academic Year"
      const academicYear = row[6] || 'Unknown';
      
      if (!statsByYear[academicYear]) {
        statsByYear[academicYear] = {
          branchWise: {},
          placements: []
        };
      }
      
      // Column M (index 12) is "Branch" 
      const branch = row[12] || 'Unknown'; 
      
      // Initialize branch count if not exists
      statsByYear[academicYear].branchWise[branch] = 
        (statsByYear[academicYear].branchWise[branch] || 0) + 1;
      
      // Add to placements list
      statsByYear[academicYear].placements.push({
        studentName: row[1] || 'Unknown',
        role: row[3] || 'Unknown',        // Job Title
        PostedBy: row[2] || 'Unknown',
        branch: branch,
        academicYear: academicYear
      });
      
      console.log(`✅ Added placement: ${row[1]} - ${academicYear} - ${branch}`);
    }
  });
  
  console.log('📈 Stats calculated:', Object.keys(statsByYear));
  return statsByYear;
}

// Extract year from ISO date string
function extractYearFromISODate(isoString) {
    if (!isoString) return new Date().getFullYear();
    const date = new Date(isoString);
    return date.getFullYear();
}

module.exports = router;