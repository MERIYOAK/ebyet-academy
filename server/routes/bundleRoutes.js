const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = '/tmp/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createBundle,
  uploadThumbnail,
  getAllBundles,
  getFeaturedBundles,
  getBundleById,
  getUserPurchasedBundles,
  updateBundle,
  deleteBundle,
  archiveBundle,
  unarchiveBundle
} = require('../controllers/bundleController');

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, '/tmp/uploads');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for thumbnails
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'), false);
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
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next(error);
};

router.use(handleMulterError);

// ========================================
// PUBLIC ROUTES
// ========================================

/**
 * Get all bundles (with filtering)
 * GET /api/bundles?status=active&category=Trading&limit=20&page=1&search=investing&featured=true
 */
router.get('/', getAllBundles);

/**
 * Get featured bundles
 * GET /api/bundles/featured
 */
router.get('/featured', getFeaturedBundles);

/**
 * Get user's purchased bundles (authenticated)
 * GET /api/bundles/my-bundles?limit=20&page=1
 * NOTE: Must come before /:id route to avoid matching "my-bundles" as an ID
 */
router.get('/my-bundles', authMiddleware, getUserPurchasedBundles);

/**
 * Get bundle by ID or slug
 * GET /api/bundles/:id
 */
router.get('/:id', getBundleById);

// ========================================
// ADMIN ROUTES (Require admin authentication)
// ========================================

/**
 * Create a new bundle
 * POST /api/bundles
 * Body: { title, description, longDescription, price, originalValue, courseIds, category, tags, featured, isPublic, maxEnrollments }
 */
router.post('/', adminAuthMiddleware, createBundle);

/**
 * Upload thumbnail for a bundle
 * PUT /api/bundles/thumbnail/:bundleId
 * Body: { file }
 */
router.put('/thumbnail/:bundleId', adminAuthMiddleware, upload.single('file'), uploadThumbnail);

/**
 * Update bundle metadata
 * PUT /api/bundles/:id
 * Body: { title, description, longDescription, price, originalValue, courseIds, category, tags, featured, status, isPublic, maxEnrollments }
 */
router.put('/:id', adminAuthMiddleware, updateBundle);

/**
 * Delete a bundle
 * DELETE /api/bundles/:id
 */
router.delete('/:id', adminAuthMiddleware, deleteBundle);

/**
 * Archive a bundle
 * POST /api/bundles/:bundleId/archive
 * Body: { reason, gracePeriodMonths }
 */
router.post('/:bundleId/archive', adminAuthMiddleware, archiveBundle);

/**
 * Unarchive a bundle
 * POST /api/bundles/:bundleId/unarchive
 */
router.post('/:bundleId/unarchive', adminAuthMiddleware, unarchiveBundle);

module.exports = router;
