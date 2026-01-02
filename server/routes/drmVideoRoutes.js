const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const securityMiddleware = require('../middleware/securityMiddleware');
const drmVideoController = require('../controllers/drmVideoController');

// Get security middleware
const security = securityMiddleware.getAllMiddleware();

// Apply security middleware
router.use(security.sessionSecurity);
router.use(security.videoStreamingSecurity);

/**
 * @route GET /api/drm/videos/:videoId
 * @desc Get video by ID with DRM protection
 * @access Private (Student/User)
 */
router.get('/videos/:videoId', authMiddleware, security.validateVideoAccess, drmVideoController.getVideoByIdWithDRM);

/**
 * @route GET /api/drm/courses/:courseId/videos
 * @desc Get course videos with DRM protection (public access, but videos locked for non-purchased users)
 * @access Public (Optional auth - videos locked if not purchased)
 */
router.get('/courses/:courseId/videos', optionalAuth, drmVideoController.getCourseVideosWithDRM);

/**
 * @route POST /api/drm/decrypt-url
 * @desc Decrypt DRM video URL
 * @access Private (Student/User)
 */
router.post('/decrypt-url', drmVideoController.decryptVideoUrl);

/**
 * @route POST /api/drm/sessions/:sessionId/validate
 * @desc Validate DRM session
 * @access Private (Student/User)
 */
router.post('/sessions/:sessionId/validate', security.validateDRMSession, drmVideoController.validateDRMSession);

/**
 * @route DELETE /api/drm/sessions/:sessionId
 * @desc Revoke DRM session
 * @access Private (Student/User)
 */
router.delete('/sessions/:sessionId', drmVideoController.revokeDRMSession);

/**
 * @route GET /api/drm/stats
 * @desc Get DRM session statistics
 * @access Private (Admin only)
 */
router.get('/stats', adminAuthMiddleware, drmVideoController.getDRMStats);

module.exports = router;
