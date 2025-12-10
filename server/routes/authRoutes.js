const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer = require('multer');
const authController = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');
const s3Service = require('../services/s3Service');

// Configure multer for profile photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
  }
  if (error.message.includes('Only image files')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next(error);
};

// Apply error handling middleware
router.use(handleMulterError);

// ========================================
// LOCAL AUTHENTICATION ROUTES
// ========================================

/**
 * Check email availability for registration
 * POST /api/auth/check-email
 */
router.post('/check-email', authController.checkEmailAvailability);

/**
 * Register new user (requires email verification)
 * POST /api/auth/register
 * Body: { name, email, password, profilePhoto? }
 */
router.post('/register', upload.single('profilePhoto'), authController.register);

/**
 * Verify email with token
 * POST /api/auth/verify-email
 * Body: { token }
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 * Body: { email }
 */
router.post('/resend-verification', authController.resendVerification);

/**
 * Send password reset email
 * POST /api/auth/forgot-password
 * Body: { email }
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * Reset password with token
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 */
router.post('/reset-password', authController.resetPassword);

/**
 * Login user with local authentication
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', authController.login);

/**
 * Verify JWT token
 * POST /api/auth/verify-token
 * Headers: Authorization: Bearer <token>
 */
router.post('/verify-token', authController.verifyToken);

/**
 * Get current user profile
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
router.get('/me', auth, authController.getCurrentUser);

/**
 * Update user profile
 * PUT /api/auth/profile
 * Headers: Authorization: Bearer <token>
 * Body: { name?, email?, profilePhoto? }
 */
router.put('/profile', auth, upload.single('profilePhoto'), authController.updateProfile);

/**
 * Change password (for local users only)
 * PUT /api/auth/change-password
 * Headers: Authorization: Bearer <token>
 * Body: { currentPassword, newPassword }
 */
router.put('/change-password', auth, authController.changePassword);

/**
 * Logout user
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <token>
 */
router.post('/logout', auth, authController.logout);

// ========================================
// GOOGLE OAUTH ROUTES
// ========================================

/**
 * Initiate Google OAuth login
 * GET /api/auth/google
 */
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Please contact the administrator.'
    });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

/**
 * Google OAuth callback
 * GET /api/auth/google/callback
 */
router.get('/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Please contact the administrator.'
    });
  }
  passport.authenticate('google', { session: false })(req, res, next);
}, authController.googleCallback);

/**
 * Complete Google OAuth registration with phone number
 * POST /api/auth/complete-google-registration
 * Body: { userId, phoneNumber }
 */
router.post('/complete-google-registration', authController.completeGoogleRegistration);

// ========================================
// PROFILE PHOTO ROUTES
// ========================================

/**
 * Get user profile photo signed URL
 * GET /api/users/me/photo
 * Headers: Authorization: Bearer <token>
 */
router.get('/users/me/photo', auth, authController.getProfilePhoto);

/**
 * Delete user profile photo
 * DELETE /api/users/me/photo
 * Headers: Authorization: Bearer <token>
 */
router.delete('/users/me/photo', auth, authController.deleteProfilePhoto);

/**
 * Upload user profile photo only
 * PUT /api/users/me/photo
 * Headers: Authorization: Bearer <token>
 * Body: FormData with profilePhoto file
 */
router.put('/users/me/photo', auth, upload.single('profilePhoto'), authController.uploadProfilePhoto);

// ========================================
// HEALTH CHECK ROUTE
// ========================================

/**
 * Health check for authentication service
 * GET /api/auth/health
 */
router.get('/health', (req, res) => {
  const features = {
    localAuth: true,
    googleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    profilePhotos: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    jwtAuth: !!(process.env.JWT_SECRET),
    emailVerification: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  };

  res.json({
    success: true,
    message: 'Authentication service is running',
    timestamp: new Date().toISOString(),
    features
  });
});

module.exports = router; 