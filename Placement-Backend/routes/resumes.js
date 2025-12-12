const express = require('express');
const { serveResumeFile } = require('../utils/driveOAuth');
const router = express.Router();

// Serve resume files
router.get('/*', serveResumeFile);

module.exports = router;