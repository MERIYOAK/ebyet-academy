const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const auth = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = '/tmp/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for material uploads (accepts various file types)
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
    fileSize: 100 * 1024 * 1024, // 100MB limit for materials
  },
  fileFilter: (req, file, cb) => {
    // Allow various file types for materials
    const allowedMimes = [
      'application/pdf', // PDF
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
      'text/csv',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/json',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'audio/mpeg',
      'audio/mp3',
      'application/x-python-code',
      'text/x-python'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Allowed types: PDF, Excel, Word, PowerPoint, CSV, ZIP, images, audio, Python files'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 100MB.'
      });
    }
  }
  if (error.message.includes('File type not allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next(error);
};

router.use(handleMulterError);

// ========================================
// ADMIN ROUTES (Require admin authentication)
// ========================================

/**
 * Upload material for a course version
 * POST /api/materials/upload
 * Body: { courseId, version, title, description, order, file }
 */
router.post('/upload', auth, adminAuthMiddleware, upload.single('file'), materialController.uploadMaterial);

/**
 * Update material metadata
 * PUT /api/materials/:materialId
 * Body: { title, description, order }
 */
router.put('/:materialId', auth, adminAuthMiddleware, materialController.updateMaterial);

/**
 * Delete material
 * DELETE /api/materials/:materialId
 */
router.delete('/:materialId', auth, adminAuthMiddleware, materialController.deleteMaterial);

// ========================================
// USER ROUTES (Require authentication and purchase)
// ========================================

/**
 * Get materials for a course (requires purchase)
 * GET /api/materials/course/:courseId
 * Query: ?version=1 (optional, defaults to current version)
 * Note: Uses optionalAuth middleware - allows unauthenticated requests but requires auth for access
 */
router.get('/course/:courseId', optionalAuth, materialController.getMaterialsByCourse);

module.exports = router;



