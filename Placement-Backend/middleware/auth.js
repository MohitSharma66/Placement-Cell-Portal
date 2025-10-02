const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        msg: 'No token provided, authorization denied',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded); // Add this for debugging
    
    // Check the actual structure of the decoded token
    let userId;
    if (decoded.user && decoded.user.id) {
      userId = decoded.user.id;
    } else if (decoded.id) {
      userId = decoded.id;
    } else if (decoded.userId) {
      userId = decoded.userId;
    } else {
      return res.status(401).json({ 
        msg: 'Invalid token structure',
        code: 'INVALID_TOKEN_STRUCTURE'
      });
    }

    // Check if user still exists
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        msg: 'Token is not valid, user not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Add user to request
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        msg: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        msg: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(500).json({ 
      msg: 'Server error in authentication',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        msg: 'Access denied: insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
  };
};

module.exports = { auth, requireRole };