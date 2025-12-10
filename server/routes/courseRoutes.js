const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const auth = require('../middleware/authMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const multer = require('multer');
const upload = multer();

// Thumbnail routes (specific routes first)
router.post('/thumbnail', auth, adminAuthMiddleware, upload.single('file'), courseController.uploadThumbnail);
router.delete('/thumbnail/:courseId', auth, adminAuthMiddleware, courseController.deleteThumbnail);
router.put('/thumbnail/:courseId', auth, adminAuthMiddleware, upload.single('file'), courseController.updateThumbnail);

// Course routes (parameterized routes after specific routes)
router.get('/', require('../middleware/optionalAuthMiddleware'), courseController.getCourses);
router.get('/:id', courseController.getCourse);
router.post('/', auth, adminAuthMiddleware, courseController.createCourse);
router.put('/:id', auth, adminAuthMiddleware, courseController.updateCourse);
router.delete('/:id', auth, adminAuthMiddleware, courseController.deleteCourse);

// WhatsApp group access routes
router.get('/:courseId/group-token', auth, courseController.generateGroupToken);
router.get('/:courseId/join', courseController.joinGroup);

module.exports = router; 