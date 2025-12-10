const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Admin login route (public)
router.post('/login', adminController.adminLogin);

// Token validation route (protected)
router.get('/validate', adminAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    admin: req.admin
  });
});

// Protected admin routes (require authentication)
router.get('/dashboard', adminAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Admin dashboard accessed successfully',
    admin: req.admin
  });
});

// Example: Product management routes
router.get('/products', adminAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Admin products management',
    admin: req.admin
  });
});

router.post('/products', adminAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Product created successfully',
    admin: req.admin
  });
});

// Example: User management routes
router.get('/users', adminAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Admin users management',
    admin: req.admin
  });
});


module.exports = router; 