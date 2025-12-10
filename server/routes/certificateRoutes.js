const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const authMiddleware = require('../middleware/authMiddleware');

// Public verification endpoint (no auth required) - must be before auth middleware
router.get('/verify/:certificateId', certificateController.verifyCertificate);

// Apply authentication middleware to all other routes
router.use(authMiddleware);

// Generate certificate for a course
router.post('/generate', certificateController.generateCertificate);

// Get user's certificates
router.get('/user', certificateController.getUserCertificates);

// Get certificate for specific course
router.get('/course/:courseId', certificateController.getCourseCertificate);

// Download certificate PDF
router.get('/download/:certificateId', certificateController.downloadCertificate);

module.exports = router;
