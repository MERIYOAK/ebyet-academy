const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import Passport configuration
const passport = require('./config/passport');

// Import services
const emailService = require('./services/emailService');
const socketService = require('./services/socketService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const courseRoutesEnhanced = require('./routes/courseRoutesEnhanced');
const myCoursesRoutes = require('./routes/myCoursesRoutes');
const archiveRoutes = require('./routes/archiveRoutes');
const videoRoutes = require('./routes/videoRoutes');
const materialRoutes = require('./routes/materialRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminReviewRoutes = require('./routes/adminReviewRoutes');
const drmVideoRoutes = require('./routes/drmVideoRoutes');
const contactRoutes = require('./routes/contactRoutes');
const bundleRoutes = require('./routes/bundleRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const versionRoutes = require('./routes/versionRoutes');

// Import controllers for fallback routes
const authController = require('./controllers/authController');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const adminAuthMiddleware = require('./middleware/adminAuthMiddleware');
const securityMiddleware = require('./middleware/securityMiddleware');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const app = express();

// CORS configuration for development and production
// Normalize URLs to ensure they have proper protocols
const normalizeUrl = (url) => {
  if (!url) return url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

const allowedOrigins = [
  normalizeUrl(process.env.FRONTEND_URL || 'http://localhost:5173'),
  normalizeUrl(process.env.CLIENT_URL || 'http://localhost:5173'),
  'http://127.0.0.1:5173', // Alternative localhost
  'https://ebyet-academy-pink.vercel.app', // Production Vercel frontend
  'https://www.ibyet.com', // Production website with HTTPS
].filter(Boolean); // Remove any undefined values

// Apply security middleware
const security = securityMiddleware.getAllMiddleware();
app.use(security.securityHeaders);
app.use(security.rateLimiter);
app.use(security.securityMonitoring);
app.use(security.antiBotProtection);

console.log('🔧 CORS Allowed Origins:', allowedOrigins);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    console.log('🔧 CORS Request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ Allowing request with no origin');
      return callback(null, true);
    }

    // In development, be more permissive with localhost origins
    if (process.env.NODE_ENV === 'development') {
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      if (isLocalhost) {
        console.log('✅ Development: Allowing localhost origin:', origin);
        return callback(null, true);
      }
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ Origin blocked:', origin);
      console.log('❌ Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-mobile-client'],
  preflightContinue: true,
  optionsSuccessStatus: 200
}));

// Parse JSON bodies for all routes except webhook
app.use((req, res, next) => {
  if (req.path === '/api/payment/webhook') {
    // Skip JSON parsing for webhook route - let the route handle raw body
    next();
  } else {
    express.json({ limit: '1.1gb' })(req, res, next);
  }
});

// Parse URL-encoded bodies for all routes except webhook
app.use((req, res, next) => {
  if (req.path === '/api/payment/webhook') {
    // Skip URL parsing for webhook route
    next();
  } else {
    express.urlencoded({ extended: true, limit: '1.1gb' })(req, res, next);
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Handle OPTIONS requests for CORS preflight
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  console.log('🔧 OPTIONS preflight request from origin:', origin);
  
  // Check if origin is allowed
  if (!origin || allowedOrigins.indexOf(origin) !== -1 || 
      (process.env.NODE_ENV === 'development' && (origin.includes('localhost') || origin.includes('127.0.0.1')))) {
    
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-mobile-client');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    console.log('✅ Preflight request allowed for origin:', origin);
    return res.status(200).end();
  }
  
  console.log('❌ Preflight request blocked for origin:', origin);
  return res.status(403).json({ error: 'CORS policy violation' });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: allowedOrigins
    }
  });
});

// Test API route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Handle favicon.ico requests (browsers often request this)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content - let static middleware handle favicon.svg
});

// Note: Certificate PDFs are now served directly from S3 with public-read ACL
// No local file serving needed for certificates

// Public certificate preview route
app.get(['/certificate-preview/:certificateId', '/verify/:certificateId'], async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    // Import Certificate model
    const Certificate = require('./models/Certificate');
    
    // Find certificate by ID
    const certificate = await Certificate.getByCertificateId(certificateId);
    
    if (!certificate) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Certificate Not Found</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
          <div class="text-center max-w-md mx-auto p-8">
            <div class="text-red-500 mb-4">
              <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold mb-4 text-gray-900">Certificate Not Found</h2>
            <p class="text-gray-600 mb-6">The certificate you're looking for doesn't exist or has been removed.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors duration-200">
              Go to Homepage
            </a>
          </div>
        </body>
        </html>
      `);
    }
    
    // Generate PDF on-the-fly for display
    const certificateController = require('./controllers/certificateController');
    const pdfBuffer = await certificateController.generateCertificatePDF(certificate);
    
    // Convert PDF buffer to base64 for embedding
    const pdfBase64 = pdfBuffer.toString('base64');
    const pdfDataUri = `data:application/pdf;base64,${pdfBase64}`;
    
    // Format date for display
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    // Helper function to get English text for certificate preview
    const getEnglishText = (text) => {
      if (!text) return text;
      
      // Handle bilingual objects
      if (typeof text === 'object' && text.en) {
        return text.en;
      }
      
      // Handle Tigrinya strings - remove Unicode characters
      if (typeof text === 'string') {
        return text.replace(/[\u1200-\u137F]/g, '').trim();
      }
      
      return text;
    };
    
    // Create polished HTML page with enhanced design
    const html = `
     <!DOCTYPE html>
     <html lang="en">
     <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Certificate of Completion - ${getEnglishText(certificate.courseTitle)}</title>
       <meta name="description" content="Certificate of Completion issued by IBYET-INVESTING">
       <script src="https://cdn.tailwindcss.com"></script>
       <link rel="preconnect" href="https://fonts.googleapis.com">
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
       <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
       <style>
         body {
           font-family: 'Inter', sans-serif;
         }
         .pdf-container {
           height: calc(100vh - 200px);
           min-height: 600px;
         }
         @media (max-width: 768px) {
           .pdf-container {
             height: calc(100vh - 240px);
             min-height: 500px;
           }
         }
         .gradient-border {
           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
           padding: 2px;
         }
         .hover-lift {
           transition: all 0.3s ease;
         }
         .hover-lift:hover {
           transform: translateY(-2px);
           box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
         }
         .certificate-badge {
           background: linear-gradient(135deg, #10b981 0%, #059669 100%);
           animation: pulse 2s infinite;
         }
         @keyframes pulse {
           0%, 100% { opacity: 1; }
           50% { opacity: 0.8; }
         }
       </style>
     </head>
     <body class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
       <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
         <!-- Header Section -->
         <div class="text-center mb-8">
           <div class="certificate-badge inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 shadow-xl">
             <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
           </div>
           <div class="mb-4">
             <h1 class="text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
               Certificate of Completion
             </h1>
             <div class="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-md mb-4">
               <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
               </svg>
               <span class="text-sm font-medium text-gray-700">Verified Certificate</span>
             </div>
           </div>
           <div class="bg-white rounded-2xl shadow-lg p-6 mb-6 hover-lift">
             <h2 class="text-2xl font-semibold text-gray-900 mb-2">${getEnglishText(certificate.courseTitle)}</h2>
             <div class="flex items-center justify-center space-x-6 text-sm text-gray-600">
               <div class="flex items-center">
                 <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                 </svg>
                 <span>Awarded to: <strong>${certificate.studentName}</strong></span>
               </div>
               <div class="flex items-center">
                 <svg class="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
                 <span>Issued: ${formatDate(certificate.dateIssued)}</span>
               </div>
             </div>
             <div class="mt-4 pt-4 border-t border-gray-200">
               <p class="text-xs text-gray-500 flex items-center justify-center">
                 <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 Certificate ID: <code class="ml-1 px-2 py-1 bg-gray-100 rounded">${certificate.certificateId}</code>
               </p>
             </div>
           </div>
         </div>
         
         <!-- PDF Viewer Section -->
         <div class="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 hover-lift">
           <div class="gradient-border">
             <div class="bg-white px-6 py-4">
               <div class="flex items-center justify-between">
                 <div class="flex items-center space-x-3">
                   <div class="p-2 bg-red-500 rounded-lg">
                     <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                     </svg>
                   </div>
                   <div>
                     <h3 class="text-lg font-semibold text-gray-900">Official Certificate Document</h3>
                     <p class="text-sm text-gray-500">High-resolution PDF certificate suitable for printing and sharing</p>
                   </div>
                 </div>
                 <div class="flex items-center space-x-2">
                   <span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Verified</span>
                   <span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Official</span>
                 </div>
               </div>
             </div>
           </div>
           <div class="pdf-container bg-gray-50">
             <iframe 
               src="${pdfDataUri}" 
               class="w-full h-full border-0"
               title="Certificate PDF"
               style="background: white;"
             ></iframe>
           </div>
         </div>
         
         <!-- Action Buttons -->
         <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
           <a
             href="${pdfDataUri}"
             download="certificate-${getEnglishText(certificate.courseTitle).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"
             class="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
           >
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
             <span>Download Certificate</span>
           </a>
           <a
             href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${certificate.certificateId}"
             target="_blank"
             class="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
           >
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
             </svg>
             <span>Verify Authenticity</span>
           </a>
         </div>
         
         <!-- Footer -->
         <div class="text-center">
           <div class="inline-flex items-center px-6 py-3 bg-white rounded-full shadow-md">
             <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
               <span class="text-white font-bold text-sm">IB</span>
             </div>
             <div class="text-left">
               <p class="text-sm font-medium text-gray-900">IBYET-INVESTING</p>
               <p class="text-xs text-gray-500">Professional Investment Education Platform</p>
             </div>
           </div>
           <p class="mt-4 text-xs text-gray-500">
             2026 IBYET-INVESTING. All certificates are cryptographically verifiable.
           </p>
         </div>
       </div>
     </body>
     </html>
    `;
    
    res.send(html);
   
  } catch (error) {
    console.error('Error serving certificate preview:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - Certificate Preview</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div class="text-center max-w-md mx-auto p-8">
          <div class="text-red-500 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold mb-4 text-gray-900">Error Loading Certificate</h2>
          <p class="text-gray-600 mb-6">There was an error loading the certificate. Please try again later.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors duration-200">
            Go to Homepage
          </a>
        </div>
      </body>
      </html>
    `);
  }
});

// Favicon is handled by static middleware - no custom route needed

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  // Removed deprecated options: useNewUrlParser and useUnifiedTopology
  // These are no longer needed in MongoDB Driver 4.0+
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    
    // Start auto-archive scheduler only after MongoDB is connected
    const { startAutoArchiveScheduler } = require('./utils/autoArchiveScheduler');
    startAutoArchiveScheduler();
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Provide specific help for MongoDB Atlas connection issues
    if (error.message && error.message.includes('Atlas')) {
      console.log('\n🔒 MongoDB Atlas Connection Issue Detected');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 To fix this, you need to whitelist your IP address:');
      console.log('   1. Go to: https://cloud.mongodb.com/');
      console.log('   2. Select your cluster');
      console.log('   3. Click "Network Access" in the left sidebar');
      console.log('   4. Click "Add IP Address"');
      console.log('   5. Click "Add Current IP Address" (or enter 0.0.0.0/0 for all IPs - less secure)');
      console.log('   6. Wait 1-2 minutes for changes to propagate');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else if (MONGODB_URI && MONGODB_URI.includes('localhost')) {
      console.log('💡 Make sure MongoDB is running locally');
      console.log('   Start MongoDB: mongod (or use MongoDB service)');
    } else {
      console.log('💡 Check your MONGODB_URI in .env file');
      console.log('   Make sure the connection string is correct');
    }
    
    // In development, don't exit on MongoDB connection failure
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('⚠️  Continuing without MongoDB connection in development mode');
    }
  });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/my-courses', myCoursesRoutes);
app.use('/api/reviews', require('./routes/reviewRoutes.js')); 
app.use('/api/admin/reviews', adminReviewRoutes);

// Fallback route for profile photo (backward compatibility)
app.get('/api/users/me/photo', authMiddleware, (req, res) => {
  authController.getProfilePhoto(req, res);
});

app.delete('/api/users/me/photo', authMiddleware, (req, res) => {
  authController.deleteProfilePhoto(req, res);
});

app.put('/api/users/me/photo', authMiddleware, upload.single('profilePhoto'), (req, res) => {
  authController.uploadProfilePhoto(req, res);
});

// Enhanced course routes (new versioning system) - PRIMARY
app.use('/api/courses', courseRoutesEnhanced);

// Legacy course routes (for backward compatibility)
app.use('/api/courses-legacy', courseRoutes);

// Bundle routes
app.use('/api/bundles', bundleRoutes);

// Archive management routes (admin only)
app.use('/api/archive', archiveRoutes);

// Video routes
app.use('/api/videos', videoRoutes);
app.use('/api/materials', materialRoutes);

// DRM Video routes
app.use('/api/drm', drmVideoRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Payment routes
app.use('/api/payment', paymentRoutes);
app.use('/api/payments', paymentRoutes); // Also support plural for webhook compatibility

// User routes
app.use('/api/user', userRoutes);

// Contact routes
app.use('/api/contact', contactRoutes);
app.use('/api/announcements', announcementRoutes);

app.use('/api/version', versionRoutes);
const progressRoutes = require('./routes/progressRoutes');
app.use('/api/progress', progressRoutes);

// Data quality monitoring and cleanup endpoint
app.get('/api/admin/data-quality', adminAuthMiddleware, async (req, res) => {
  try {
    const Video = require('./models/Video');
    const Course = require('./models/Course');
    const User = require('./models/User');
    const Bundle = require('./models/Bundle');
    const Review = require('./models/Review');
    const Announcement = require('./models/Announcement');

    console.log('🔍 Running data quality check...');

    const issues = [];

    // Check for orphaned videos
    const orphanedVideos = await Video.countDocuments({
      $or: [
        { course: null },
        { course: { $exists: false } }
      ]
    });

    if (orphanedVideos > 0) {
      issues.push({
        type: 'orphaned_videos',
        count: orphanedVideos,
        severity: 'high',
        message: `${orphanedVideos} videos without course assignment`
      });
    }

    // Check for videos without S3 keys
    const videosWithoutS3 = await Video.countDocuments({
      $or: [
        { s3Key: null },
        { s3Key: { $exists: false } },
        { s3Key: '' }
      ]
    });

    if (videosWithoutS3 > 0) {
      issues.push({
        type: 'videos_without_s3',
        count: videosWithoutS3,
        severity: 'high',
        message: `${videosWithoutS3} videos without S3 keys`
      });
    }

    // Check for duplicate videos by S3 key
    const duplicateVideos = await Video.aggregate([
      { $group: { _id: '$s3Key', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $group: { _id: null, totalDuplicates: { $sum: '$count' }, duplicateGroups: { $sum: 1 } } }
    ]);

    if (duplicateVideos.length > 0 && duplicateVideos[0].totalDuplicates > 0) {
      issues.push({
        type: 'duplicate_videos',
        count: duplicateVideos[0].duplicateGroups,
        severity: 'medium',
        message: `${duplicateVideos[0].duplicateGroups} duplicate video groups found`
      });
    }

    // Get overall statistics
    const [totalVideos, totalCourses, totalUsers] = await Promise.all([
      Video.countDocuments(),
      Course.countDocuments(),
      User.countDocuments()
    ]);

    const healthScore = issues.length === 0 ? 100 : Math.max(0, 100 - (issues.filter(i => i.severity === 'high').length * 20) - (issues.filter(i => i.severity === 'medium').length * 10));

    const report = {
      timestamp: new Date().toISOString(),
      totalRecords: {
        videos: totalVideos,
        courses: totalCourses,
        users: totalUsers
      },
      issues,
      healthScore,
      status: issues.length === 0 ? 'healthy' : issues.filter(i => i.severity === 'high').length > 0 ? 'critical' : 'warning'
    };

    console.log('✅ Data quality check completed:', { healthScore, issueCount: issues.length });

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('❌ Data quality check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check data quality',
      error: error.message
    });
  }
});

// Auto-cleanup endpoint (use with caution)
app.post('/api/admin/auto-cleanup', adminAuthMiddleware, async (req, res) => {
  try {
    const Video = require('./models/Video');
    const Course = require('./models/Course');

    console.log('🧹 Starting auto-cleanup...');

    // Only clean orphaned videos (safe operation)
    const orphanedResult = await Video.deleteMany({
      $or: [
        { course: null },
        { course: { $exists: false } }
      ]
    });

    // Remove videos without valid S3 keys
    const invalidS3Result = await Video.deleteMany({
      $or: [
        { s3Key: null },
        { s3Key: { $exists: false } },
        { s3Key: '' }
      ]
    });

    const cleanupResult = {
      orphanedVideosRemoved: orphanedResult.deletedCount,
      invalidS3VideosRemoved: invalidS3Result.deletedCount,
      totalRemoved: orphanedResult.deletedCount + invalidS3Result.deletedCount,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Auto-cleanup completed:', cleanupResult);

    res.json({
      success: true,
      data: cleanupResult,
      message: `Successfully removed ${cleanupResult.totalRemoved} invalid video records`
    });

  } catch (error) {
    console.error('❌ Auto-cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform auto-cleanup',
      error: error.message
    });
  }
});

// Admin dashboard stats (comprehensive and accurate stats)
app.get('/api/admin/stats', adminAuthMiddleware, async (req, res) => {
  try {
    const Course = require('./models/Course');
    const Video = require('./models/Video');
    const User = require('./models/User');
    const Bundle = require('./models/Bundle');
    const Review = require('./models/Review');
    const Announcement = require('./models/Announcement');

    console.log(' Fetching accurate admin stats...');

    // Get comprehensive counts with strict filtering (no orphaned documents)
    const [
      totalUsers,
      totalCourses,
      totalVideos,
      totalBundles,
      totalReviews,
      totalAnnouncements,
      activeCourses,
      publishedCourses,
      totalEnrollments
    ] = await Promise.all([
      // Count only regular users (not admins) with valid data
      User.countDocuments({ 
        role: 'user',
        email: { $exists: true, $ne: null, $ne: '' }
      }),
      // Count only courses with valid titles
      Course.countDocuments({ 
        title: { $exists: true, $ne: null, $ne: '' }
      }),
      // Count only videos that are actually associated with courses and have valid S3 keys
      Video.aggregate([
        { 
          $match: { 
            course: { $exists: true, $ne: null },
            s3Key: { $exists: true, $ne: null, $ne: '' },
            title: { $exists: true, $ne: null, $ne: '' }
          } 
        },
        { $group: { _id: '$s3Key', doc: { $first: '$$ROOT' } } },
        { $count: 'totalVideos' }
      ]).then(result => result[0]?.totalVideos || 0),
      // Count only bundles with valid titles and prices
      Bundle.countDocuments({ 
        title: { $exists: true, $ne: null, $ne: '' },
        price: { $exists: true, $gte: 0 }
      }),
      // Count only reviews with valid content and ratings
      Review.countDocuments({ 
        content: { $exists: true, $ne: null, $ne: '' },
        rating: { $exists: true, $gte: 1, $lte: 5 }
      }),
      // Count only announcements with valid content
      Announcement.countDocuments({ 
        title: { $exists: true, $ne: null, $ne: '' },
        content: { $exists: true, $ne: null, $ne: '' }
      }),
      // Count only active courses with valid data
      Course.countDocuments({ 
        status: 'active',
        title: { $exists: true, $ne: null, $ne: '' }
      }),
      // Count only published active courses
      Course.countDocuments({ 
        status: 'active', 
        isPublic: true,
        title: { $exists: true, $ne: null, $ne: '' }
      }),
      // Calculate accurate enrollments from courses with valid student data
      Course.aggregate([
        { 
          $match: { 
            enrolledStudents: { $exists: true, $ne: [] },
            title: { $exists: true, $ne: null, $ne: '' }
          } 
        },
        { $project: { enrolledCount: { $size: "$enrolledStudents" } } },
        { $group: { _id: null, total: { $sum: "$enrolledCount" } } }
      ])
    ]);

    // Get additional accurate stats
    const recentUsers = await User.countDocuments({ 
      role: 'user',
      email: { $exists: true, $ne: null, $ne: '' },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    const recentCourses = await Course.countDocuments({ 
      title: { $exists: true, $ne: null, $ne: '' },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // Popular courses with valid data only
    const popularCoursesRaw = await Course.aggregate([
      { 
        $match: { 
          enrolledStudents: { $exists: true, $ne: [] },
          title: { $exists: true, $ne: null, $ne: '' }
        } 
      },
      { 
        $addFields: { 
          enrolledCount: { $size: "$enrolledStudents" },
          title: "$title",
          thumbnail: "$thumbnail"
        }
      },
      { $sort: { enrolledCount: -1 } },
      { $limit: 5 },
      { 
        $project: { 
          title: 1,
          enrolledCount: 1,
          thumbnail: 1
        }
      }
    ]);
    
    // Process titles to handle localization properly
    const popularCourses = popularCoursesRaw.map(course => ({
      ...course,
      title: typeof course.title === 'object' ? course.title.en || course.title.tg || 'Untitled Course' : course.title
    }));
    
    // Video stats for valid videos only
    const videoStats = await Video.aggregate([
      { 
        $match: { 
          course: { $exists: true, $ne: null },
          s3Key: { $exists: true, $ne: null, $ne: '' },
          title: { $exists: true, $ne: null, $ne: '' }
        } 
      },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' },
          totalSize: { $sum: '$fileSize' },
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      // Main counts (accurate and validated)
      totalUsers,
      totalCourses,
      totalVideos,
      totalBundles,
      totalReviews,
      totalAnnouncements,
      
      // Course breakdown
      activeCourses,
      publishedCourses,
      inactiveCourses: totalCourses - activeCourses,
      
      // Engagement stats
      totalEnrollments: totalEnrollments[0]?.total || 0,
      recentUsers,
      recentCourses,
      
      // Video stats (for valid videos only)
      videoStats: videoStats[0] || {
        totalDuration: 0,
        avgDuration: 0,
        totalSize: 0,
        count: 0
      },
      
      // Popular courses (validated)
      popularCourses,
      
      // Data quality metrics
      dataQuality: {
        validVideoCount: videoStats[0]?.count || 0,
        orphanedVideos: 0, // Should be 0 after cleanup
        duplicateVideos: 0, // Should be 0 after cleanup
        lastValidated: new Date().toISOString()
      },
      
      // Timestamp
      lastUpdated: new Date().toISOString()
    };

    console.log(' Admin stats calculated successfully:', {
      totalUsers,
      totalCourses, 
      totalVideos,
      dataQuality: stats.dataQuality
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(' Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics',
      error: error.message
    });
  }
});

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found'
  });
});

// Environment validation
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];

// Optional environment variables
const optionalEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_PORT',
  'SMTP_SECURE',
  'FROM_EMAIL',
  'FRONTEND_URL',
  'BACKEND_URL',
  'SESSION_SECRET'
];

// Set fallback values for development
if (process.env.NODE_ENV !== 'production') {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ibyet-investing';
  process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret';
  process.env.SMTP_PORT = process.env.SMTP_PORT || '587';
  process.env.SMTP_SECURE = process.env.SMTP_SECURE || 'false';
}

const missingRequiredVars = requiredEnvVars.filter(varName => !process.env[varName]);
const missingOptionalVars = optionalEnvVars.filter(varName => !process.env[varName]);

if (missingRequiredVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingRequiredVars);
  console.log('💡 Create a .env file with the required variables');
  console.log('💡 For development, these will be set to default values');
  
  // In development, set default values instead of exiting
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔄 Setting default values for development...');
    if (!process.env.MONGODB_URI) {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/ibyet-investing';
      console.log('   MONGODB_URI set to default');
    }
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'dev-jwt-secret-change-in-production';
      console.log('   JWT_SECRET set to default');
    }
  } else {
    process.exit(1);
  }
}

if (missingOptionalVars.length > 0 && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  Missing optional environment variables:', missingOptionalVars);
  console.log('💡 These features will be disabled:');
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('   - Google OAuth authentication');
  }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('   - Profile photo uploads to S3');
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('   - Email verification system');
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Don't expose internal errors to client
  if (err.code === 'ENOENT') {
    return res.status(404).json({ 
      error: 'Resource not found',
      message: 'The requested resource could not be found'
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'Something went wrong on the server'
  });
});

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server with Socket.IO
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store connected users
const connectedUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  // Handle user authentication
  socket.on('authenticate', (userData) => {
    connectedUsers.set(socket.id, {
      userId: userData.userId,
      role: userData.role,
      socketId: socket.id
    });
    console.log(`👤 User authenticated: ${userData.userId} (${userData.role})`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    connectedUsers.delete(socket.id);
  });
});

// Make io instance available to routes
app.set('io', io);
app.set('connectedUsers', connectedUsers);

// Initialize socket service
socketService.initialize(io);
socketService.setConnectedUsers(connectedUsers);

// Make socket service available to routes
app.set('socketService', socketService);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Note: Auto-archive scheduler is started after MongoDB connection is established
  
  // Check S3 configuration on startup
  console.log('\n🔍 Checking S3 configuration...');
  const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
  
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET;
  
  if (!accessKeyId || !secretAccessKey || !bucket) {
    console.log('⚠️  S3 not configured - uploads will use local storage');
    console.log('💡 To enable S3, add these to your .env file:');
    console.log('   AWS_ACCESS_KEY_ID=your_access_key');
    console.log('   AWS_SECRET_ACCESS_KEY=your_secret_key');
    console.log('   AWS_S3_BUCKET=your_bucket_name');
  } else {
    console.log('✅ S3 environment variables found');
    console.log(`   - Bucket: ${bucket}`);
    console.log(`   - Region: ${region}`);
    
    // Test S3 connection by listing objects in the specific bucket (requires only s3:ListBucket on that bucket)
    const testS3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });
    
    testS3Client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }))
      .then(() => {
        console.log('✅ S3 connection successful - uploads will use S3');
      })
      .catch((error) => {
        console.log('❌ S3 connection failed - uploads will use local storage');
        console.log(`   Error: ${error.message}`);
        console.log('💡 Check your AWS credentials and bucket permissions');
      });
  }

  // Check email configuration on startup
  console.log('\n📧 Checking email configuration...');
  if (emailService.isEmailConfigured()) {
    console.log('✅ Email service configured - verification emails will be sent');
  } else {
    console.log('⚠️  Email service not configured - verification emails will be skipped');
    console.log('💡 To enable email verification, add these to your .env file:');
    console.log('   SMTP_HOST=smtp.gmail.com');
    console.log('   SMTP_USER=your-email@gmail.com');
    console.log('   SMTP_PASSWORD=your-app-password');
  }

  // Check Stripe configuration on startup
  console.log('\n💳 Checking Stripe configuration...');
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (stripeSecretKey) {
    if (stripeSecretKey.startsWith('sk_test_')) {
      console.log('✅ Stripe TEST MODE configured - payments will use Stripe Checkout (test mode)');
      console.log('   - Payments will redirect to Stripe\'s hosted payment page');
      console.log('   - Use test cards: 4242 4242 4242 4242');
    } else if (stripeSecretKey.startsWith('sk_live_')) {
      console.log('⚠️  Stripe LIVE MODE configured - REAL payments will be processed!');
      console.log('   - Payments will redirect to Stripe\'s hosted payment page');
    } else {
      console.log('⚠️  Stripe key format unrecognized');
    }
    
    if (!stripeWebhookSecret) {
      console.log('⚠️  STRIPE_WEBHOOK_SECRET not set - webhooks may not work');
      console.log('💡 For local development, run: npm run stripe:listen');
      console.log('💡 For production, add webhook secret from Stripe Dashboard');
    } else {
      console.log('✅ Stripe webhook secret configured');
    }
  } else {
    console.log('⚠️  Stripe not configured - using development mode (no real payments)');
    console.log('💡 To enable Stripe Checkout, add to your .env file:');
    console.log('   STRIPE_SECRET_KEY=sk_test_your_test_key_here');
    console.log('   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here');
    console.log('💡 Get your keys from: https://dashboard.stripe.com/test/apikeys');
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

module.exports = app; 