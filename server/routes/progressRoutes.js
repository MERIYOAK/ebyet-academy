const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const progressController = require('../controllers/progressController');

// Get simplified dashboard data (without progress tracking)
router.get('/dashboard', auth, progressController.getDashboard);

module.exports = router;
