const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Security imports
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Custom middleware imports
const { errorHandler, notFound } = require('./middleware/errorHandler');

dotenv.config();

console.log('Environment:', process.env.NODE_ENV);
console.log('Credentials path:', process.env.GOOGLE_SHEETS_CREDENTIALS_PATH);
console.log('=== SERVER CONFIGURATION ===');
console.log('Server IP:', '172.16.61.184');
console.log('Server Domain:', 'placement.iiitnr.edu.in');
console.log('Server Port:', process.env.PORT || 5000);
console.log('MongoDB Host:', process.env.MONGO_URI ? 'external' : 'localhost (127.0.0.1)');

const app = express();

// ========================
// SECURITY MIDDLEWARE
// ========================

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "https://placement.iiitnr.edu.in", "http://172.16.61.184"]
    }
  }
}));

// Enable CORS with specific origins - UPDATED WITH DOMAIN
const allowedOrigins = [
  'http://localhost:5173',           // Local development
  'http://localhost:3000',           // Alternative local dev
  'http://172.16.61.184',            // Server IP (HTTP)
  'https://172.16.61.184',           // Server IP (HTTPS)
  'http://placement.iiitnr.edu.in',   // Domain (HTTP)
  'https://placement.iiitnr.edu.in',  // Domain (HTTPS) - PRIMARY
  'http://www.placement.iiitnr.edu.in',
  'https://www.placement.iiitnr.edu.in'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For development, you might want to allow all in dev mode
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Development mode: Allowing CORS for', origin);
        return callback(null, true);
      }
      
      console.log('🚫 CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
}));

// Preflight requests handling
app.options('*', cors());

// ========================
// RATE LIMITING - FIXED FOR IPV6
// ========================

// Trust proxy - important when behind Nginx
app.set('trust proxy', 1);

// Simple function to get a clean IP string
const getClientIp = (req) => {
  // Try X-Forwarded-For first (when behind Nginx)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Take the first IP in the list and clean it
    const ip = forwarded.split(',')[0].trim();
    // Remove IPv6 prefix if present
    return ip.replace(/^::ffff:/, '');
  }
  
  // Fallback to req.ip or remoteAddress
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  // Remove IPv6 prefix if present
  return ip.replace(/^::ffff:/, '');
};

// Rate limiting with simple key generation
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Return a simple string - no complex objects
    return getClientIp(req);
  },
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/api/health'
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Body parser with limits
app.use(express.json({ limit: '10mb' })); // Increased for file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'minCgpa', 'branch', 'title', 'company', 'status',
    'cgpa', 'tenthScore', 'twelfthScore', 'page', 'limit'
  ]
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${getClientIp(req)}`);
  next();
});

// ========================
// DATABASE CONNECTION
// ========================

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Force IPv4
};

mongoose.connect('mongodb://127.0.0.1:27017/placementdb', mongoOptions)
  .then(() => console.log('✅ MongoDB connected securely'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('💡 Trying alternative connection methods...');
    
    // Try alternative connection
    mongoose.connect('mongodb://localhost:27017/placementdb', mongoOptions)
      .then(() => console.log('✅ MongoDB connected via localhost'))
      .catch(err2 => {
        console.error('❌ MongoDB connection failed:', err2.message);
        process.exit(1);
      });
  });

// Database connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected! Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// ========================
// ROUTES
// ========================

app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/recruiters', require('./routes/recruiters'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
const statsRoutes = require('./routes/statistics');
app.use('/api/stats', statsRoutes);
app.use('/api/resumes', require('./routes/resumes'));

// ========================
// HEALTH CHECK & ROOT
// ========================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '1.0.0',
    domain: 'placement.iiitnr.edu.in'
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'IIITNR Placement Portal API',
    version: '1.0.0',
    description: 'Backend API for IIIT Naya Raipur Placement Portal',
    domain: 'placement.iiitnr.edu.in',
    server: '172.16.61.184',
    environment: process.env.NODE_ENV,
    endpoints: {
      students: '/api/students',
      recruiters: '/api/recruiters',
      jobs: '/api/jobs',
      applications: '/api/applications',
      statistics: '/api/stats'
    },
    cors: {
      allowedOrigins: allowedOrigins
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'IIIT Naya Raipur Placement Portal Backend Running Securely!',
    domain: 'placement.iiitnr.edu.in',
    server: '172.16.61.184',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    links: {
      api_docs: '/api/info',
      health_check: '/api/health',
      frontend: 'https://placement.iiitnr.edu.in'
    }
  });
});

// ========================
// ERROR HANDLING
// ========================

// 404 handler for undefined routes
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// ========================
// SERVER START
// ========================

const PORT = process.env.PORT || 5000;

// Determine host based on environment
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log(`
  ============================================
  🚀 IIITNR PLACEMENT PORTAL BACKEND
  ============================================
  📦 Environment: ${process.env.NODE_ENV || 'development'}
  🌐 Server: ${HOST}:${PORT}
  🔗 IP Address: 172.16.61.184:${PORT}
  🔗 Domain: https://placement.iiitnr.edu.in
  📊 Health Check: http://172.16.61.184:${PORT}/api/health
  📊 Domain Health: https://placement.iiitnr.edu.in/api/health
  🗄️  Database: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}
  ============================================
  🔒 Security Features Enabled:
  • Helmet (HTTP headers)
  • CORS (${allowedOrigins.length} allowed origins)
  • Rate Limiting (100 req/15min) - FIXED ✅
  • XSS Protection
  • NoSQL Injection Protection
  • Parameter Pollution Protection
  ============================================
  `);
});

// ========================
// GRACEFUL SHUTDOWN - FIXED FOR NEWER MONGOOSE
// ========================

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // TEMPORARY FIX: Skip MongoDB close
    console.log('⚠️ Skipping MongoDB close for now');
    process.exit(0);
    
    /* Original code - commented out for now
    mongoose.connection.close(false)
      .then(() => {
        console.log('MongoDB connection closed');
        console.log('✅ Process terminated gracefully');
        process.exit(0);
      })
      .catch((err) => {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
      });
    */
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! 💥');
  console.error('Name:', err.name);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  
  // Don't crash in production, just log
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️ Production mode: Not crashing on unhandled rejection');
  } else {
    server.close(() => {
      process.exit(1);
    });
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION! 💥');
  console.error('Name:', err.name);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// Memory usage monitoring (optional)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    console.log(`Memory - RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  }, 60000); // Every minute
}