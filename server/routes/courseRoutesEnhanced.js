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
  createCourse,
  uploadThumbnail,
  uploadVideo,
  createNewVersion,
  updateCourse,
  archiveCourse,
  unarchiveCourse,
  deactivateCourse,
  reactivateCourse,
  getDeletionSummary,
  deleteCourse,
  getAllCourses,
  getFeaturedCourses,
  getUserPurchasedCourses,
  getCourseById,
  enrollStudent,
  updateStudentProgress
} = require('../controllers/courseControllerEnhanced');

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, '/tmp/uploads'); // Use temporary directory
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow video files
    if (file.mimetype.startsWith('video/')) {
        cb(null, true);
    }
    // Allow image files for thumbnails
    else if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
      cb(new Error('Invalid file type. Only video and image files are allowed.'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 500MB.'
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

// Apply error handling middleware
router.use(handleMulterError);

// ========================================
// ADMIN ROUTES (Require admin authentication)
// ========================================

/**
 * Create a new course
 * POST /api/courses
 * Body: { title, description, price, category, tags, isPublic, maxEnrollments }
 */
router.post('/', adminAuthMiddleware, createCourse);

/**
 * Upload thumbnail for a course version
 * PUT /api/courses/thumbnail/:courseId
 * Body: { version, file }
 */
router.put('/thumbnail/:courseId', adminAuthMiddleware, upload.single('file'), uploadThumbnail);

/**
 * Upload video for a course version
 * POST /api/courses/video
 * Body: { courseId, version, title, order, file }
 */
router.post('/video', adminAuthMiddleware, upload.single('file'), uploadVideo);

/**
 * Create a new version of an existing course
 * POST /api/courses/:courseId/versions
 * Body: { changeLog }
 */
router.post('/:courseId/versions', adminAuthMiddleware, createNewVersion);

/**
 * Update course metadata
 * PUT /api/courses/:id
 * Body: { title, description, price, category, tags, status, isPublic, maxEnrollments }
 */
router.put('/:id', adminAuthMiddleware, updateCourse);

/**
 * Archive a course (soft delete)
 * POST /api/courses/:courseId/archive
 * Body: { reason, gracePeriodMonths }
 */
router.post('/:courseId/archive', adminAuthMiddleware, archiveCourse);

/**
 * Unarchive a course
 * POST /api/courses/:courseId/unarchive
 */
router.post('/:courseId/unarchive', adminAuthMiddleware, unarchiveCourse);

/**
 * Deactivate a course (removes from public listings, enrolled students keep access)
 * POST /api/courses/:courseId/deactivate
 * Body: { reason }
 */
router.post('/:courseId/deactivate', adminAuthMiddleware, deactivateCourse);

/**
 * Reactivate a course (makes it visible in public listings again)
 * POST /api/courses/:courseId/reactivate
 */
router.post('/:courseId/reactivate', adminAuthMiddleware, reactivateCourse);

/**
 * Get deletion summary for a course (before deletion)
 * GET /api/courses/:id/deletion-summary
 */
router.get('/:id/deletion-summary', adminAuthMiddleware, getDeletionSummary);

/**
 * Delete a course
 * DELETE /api/courses/:id
 */
router.delete('/:id', adminAuthMiddleware, deleteCourse);

// ========================================
// PUBLIC ROUTES (May require user authentication)
// ========================================

/**
 * Get all courses (with filtering)
 * GET /api/courses?status=active&category=programming&limit=20&page=1
 */
router.get('/', getAllCourses);

/**
 * Get featured courses (max 3 for homepage)
 * GET /api/courses/featured
 */
router.get('/featured', getFeaturedCourses);

/**
 * Get course by ID with version information
 * GET /api/courses/:id?version=2
 */
router.get('/:id', getCourseById);

// ========================================
// USER ROUTES (Require user authentication)
// ========================================

/**
 * Enroll a student in a course
 * POST /api/courses/:courseId/enroll
 */
router.post('/:courseId/enroll', authMiddleware, enrollStudent);

/**
 * Update student progress
 * PUT /api/courses/:courseId/progress
 * Body: { progress, completedVideos }
 */
router.put('/:courseId/progress', authMiddleware, updateStudentProgress);

// ========================================
// ADMIN-ONLY COURSE MANAGEMENT ROUTES
// ========================================

/**
 * Get courses by status (admin only)
 * GET /api/courses/admin/status/:status
 */
router.get('/admin/status/:status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.params;
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const Course = require('../models/Course');
    const courses = await Course.getByStatus(status)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Course.countDocuments({ status });

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('❌ Get courses by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error: error.message
    });
  }
});

/**
 * Get archived courses past grace period (admin only)
 * GET /api/courses/admin/archived-past-grace
 */
router.get('/admin/archived-past-grace', adminAuthMiddleware, async (req, res) => {
  try {
    const Course = require('../models/Course');
    const courses = await Course.getArchivedPastGracePeriod();
  
  res.json({
    success: true,
      data: {
        courses,
        count: courses.length
      }
    });
  } catch (error) {
    console.error('❌ Get archived courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch archived courses',
      error: error.message
    });
  }
});

/**
 * Bulk archive courses (admin only)
 * POST /api/courses/admin/bulk-archive
 * Body: { courseIds: [], reason, gracePeriodMonths }
 */
router.post('/admin/bulk-archive', adminAuthMiddleware, async (req, res) => {
  try {
    const { courseIds, reason, gracePeriodMonths = 6 } = req.body;
    const adminEmail = req.admin?.email || 'admin';

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Course IDs array is required'
      });
    }

    const Course = require('../models/Course');
    const results = [];

    for (const courseId of courseIds) {
      try {
        const course = await Course.findById(courseId);
        if (course) {
          await course.archive(reason || 'Bulk archive', gracePeriodMonths);
          results.push({
            courseId,
            success: true,
            title: course.title
          });
        } else {
          results.push({
            courseId,
            success: false,
            error: 'Course not found'
          });
        }
      } catch (error) {
        results.push({
          courseId,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Bulk archive completed: ${successful} successful, ${failed} failed by ${adminEmail}`);
    
    res.json({
      success: true,
      message: `Bulk archive completed: ${successful} successful, ${failed} failed`,
      data: {
        results,
        summary: {
          total: courseIds.length,
          successful,
          failed
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Bulk archive error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk archive courses',
      error: error.message
    });
  }
});


// ========================================
// WHATSAPP GROUP ROUTES (Require user authentication)
// ========================================

/**
 * Generate WhatsApp group access token
 * GET /api/courses/:courseId/group-token
 */
router.get('/:courseId/group-token', authMiddleware, require('../controllers/courseController').generateGroupToken);

/**
 * Join WhatsApp group with token
 * GET /api/courses/:courseId/join?token=...
 */
router.get('/:courseId/join', require('../controllers/courseController').joinGroup);

module.exports = router; 