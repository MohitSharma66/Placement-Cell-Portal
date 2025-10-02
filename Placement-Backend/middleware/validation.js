const { body, validationResult, param } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      msg: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .escape(),
  body('role')
    .isIn(['student', 'recruiter'])
    .withMessage('Role must be either student or recruiter'),
  handleValidationErrors
];

// Job posting validation
const validateJobPosting = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters')
    .escape(),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters')
    .escape(),
  body('minCgpa')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('CGPA must be between 0 and 10'),
  body('branch')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Branch must not exceed 50 characters')
    .escape(),
  handleValidationErrors
];

// Resume upload validation
const validateResumeUpload = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Resume title must be between 2 and 100 characters')
    .escape(),
  handleValidationErrors
];

// Object ID validation
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateJobPosting,
  validateResumeUpload,
  validateObjectId,
  handleValidationErrors
};