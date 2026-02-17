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

// Enable CORS with specific origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://172.16.61.184',
  'https://172.16.61.184',
  'http://placement.iiitnr.edu.in',
  'https://placement.iiitnr.edu.in',
  'http://www.placement.iiitnr.edu.in',
  'https://www.placement.iiitnr.edu.in'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
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

app.options('*', cors());

// ========================
// RATE LIMITING - FIXED FOR IPV6
// ========================

app.set('trust proxy', 1);

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    return ip.replace(/^::ffff:/, '');
  }
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  return ip.replace(/^::ffff:/, '');
};

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  skip: (req) => req.path === '/api/health'
});

app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp({
  whitelist: [
    'minCgpa', 'branch', 'title', 'company', 'status',
    'cgpa', 'tenthScore', 'twelfthScore', 'page', 'limit'
  ]
}));

// Request logging
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
  family: 4
};

mongoose.connect('mongodb://127.0.0.1:27017/placementdb', mongoOptions)
  .then(() => console.log('✅ MongoDB connected securely'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    mongoose.connect('mongodb://localhost:27017/placementdb', mongoOptions)
      .then(() => console.log('✅ MongoDB connected via localhost'))
      .catch(err2 => {
        console.error('❌ MongoDB connection failed:', err2.message);
        process.exit(1);
      });
  });

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
app.use('/api/stats', require('./routes/statistics'));
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
    cors: { allowedOrigins }
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

app.use(notFound);
app.use(errorHandler);

// ========================
// SERVER START
// ========================

const PORT = process.env.PORT || 5000;
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
// SIMPLE SHUTDOWN - NO ERRORS ✅
// ========================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
});

// Memory usage monitoring (optional)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    console.log(`Memory - RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  }, 60000);
}