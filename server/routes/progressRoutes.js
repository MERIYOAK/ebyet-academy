const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const progressController = require('../controllers/progressController');

// Get simplified dashboard data (without progress tracking)
router.get('/dashboard', auth, progressController.getDashboard);
router.get('/course/:courseId', auth, progressController.getCourseProgress);
router.get('/resume/:courseId/:videoId', auth, progressController.getResumePosition);
router.get('/next-video/:courseId/:videoId', auth, progressController.getNextVideo);
router.post('/update', auth, progressController.updateProgress);
router.post('/complete-video', auth, progressController.completeVideo);

module.exports = router;
