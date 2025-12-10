const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getUserPurchasedCourses } = require('../controllers/courseControllerEnhanced');

/**
 * Get user's purchased courses
 * GET /api/my-courses?limit=20&page=1
 */
router.get('/', authMiddleware, getUserPurchasedCourses);

module.exports = router; 