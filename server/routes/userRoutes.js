const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuthMiddleware');
const multer = require('multer');
const upload = multer();

// User profile routes
router.get('/profile', auth, userController.getUserProfile);
router.put('/profile', auth, userController.updateUserProfile);
router.post('/profile/picture', auth, upload.single('file'), userController.uploadProfilePicture);
router.delete('/profile/picture', auth, userController.deleteProfilePicture);

// User dashboard
router.get('/dashboard', auth, userController.getUserDashboard);

// Admin user management routes
router.get('/admin/all', auth, adminAuth, userController.getAllUsers);
router.get('/admin/:id', auth, adminAuth, userController.getUserById);
router.put('/admin/:id', auth, adminAuth, userController.updateUserByAdmin);
router.delete('/admin/:id', auth, adminAuth, userController.deleteUserByAdmin);
router.put('/admin/:id/status', auth, adminAuth, userController.updateUserStatus);

module.exports = router; 