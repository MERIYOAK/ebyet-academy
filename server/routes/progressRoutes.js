const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Update video progress
router.post('/update', progressController.updateProgress);

// Get video progress
router.get('/video/:courseId/:videoId', progressController.getVideoProgress);

// Get course progress
router.get('/course/:courseId', progressController.getCourseProgress);

// Get dashboard progress (all courses)
router.get('/dashboard', progressController.getDashboardProgress);

// Mark video as completed
router.post('/complete-video', progressController.completeVideo);

// Get next video to watch
router.get('/next-video/:courseId/:currentVideoId', progressController.getNextVideo);

// Get resume position for a video
router.get('/resume/:courseId/:videoId', progressController.getResumePosition);

// Check certificate generation status
router.get('/certificate-status/:courseId', progressController.checkCertificateStatus);

// Reset video completion status (admin use only)
router.post('/reset-completion', progressController.resetVideoCompletion);

module.exports = router; 