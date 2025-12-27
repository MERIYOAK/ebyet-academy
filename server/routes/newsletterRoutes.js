const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Public routes
router.post('/subscribe', newsletterController.subscribe);
router.post('/unsubscribe', newsletterController.unsubscribe);

// Admin routes (require admin authentication)
router.get('/subscribers', adminAuthMiddleware, newsletterController.getAllSubscribers);
router.post('/send-bulk-email', adminAuthMiddleware, newsletterController.sendBulkEmail);

module.exports = router;

