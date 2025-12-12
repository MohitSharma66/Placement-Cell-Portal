const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const express = require('express');

// Server configuration
const SERVER_PORT = process.env.PORT || 5000;
const SERVER_IP = '172.16.61.184';

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      [
        'http://localhost:5173',
        'http://localhost:3000',
        `http://${SERVER_IP}`,
        `http://${SERVER_IP}:${SERVER_PORT}`,
        `http://localhost:${SERVER_PORT}`
      ];
    
    // For debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`CORS check: ${origin} in [${allowedOrigins.join(', ')}]`);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      callback(new Error(`Not allowed by CORS. Allowed: ${allowedOrigins.join(', ')}`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Security middleware setup
const securityMiddleware = (app) => {
  // Set security HTTP headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
        connectSrc: ["'self'", `http://${SERVER_IP}:${SERVER_PORT}`]
      }
    }
  }));

  // Enable CORS
  app.use(cors(corsOptions));

  // Rate limiting
  app.use('/api/', limiter);

  // Body parser security
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());

  // Data sanitization against XSS
  app.use(xss());

  // Prevent parameter pollution
  app.use(hpp({
    whitelist: [
      'minCgpa', 'branch', 'title', 'company', 'status'
    ]
  }));
  
  // Log security configuration
  console.log('🔒 Security Middleware Loaded');
  console.log(`   Server: ${SERVER_IP}:${SERVER_PORT}`);
  console.log(`   CORS Origins: ${corsOptions.origin.toString().includes('function') ? 'Dynamic' : 'Fixed'}`);
};

module.exports = securityMiddleware;