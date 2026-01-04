const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/authMiddleware');

// Create checkout session (requires authentication)
router.post('/create-checkout-session', auth, paymentController.createCheckoutSession);

// Webhook endpoint (no auth required, uses Stripe signature verification)
// IMPORTANT: express.raw() must be used to preserve the raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  console.log('🔧 Webhook route middleware - raw body preserved');
  console.log(`   - Body type: ${typeof req.body}`);
  console.log(`   - Is Buffer: ${Buffer.isBuffer(req.body)}`);
  console.log(`   - Body length: ${req.body ? req.body.length : 'No body'}`);
  next();
}, paymentController.webhook);

// Success and cancel pages
router.get('/success', paymentController.success);
router.get('/cancel', paymentController.cancel);

// Check if user has purchased a course (requires authentication)
router.get('/check-purchase/:courseId', auth, paymentController.checkPurchase);

// Receipt endpoints (requires authentication)
router.get('/receipt/:courseId', auth, paymentController.getReceipt);
router.get('/download-receipt/:courseId', auth, paymentController.downloadReceipt);
router.get('/receipt/bundle/:bundleId', auth, paymentController.getBundleReceipt);
router.get('/download-bundle-receipt/:bundleId', auth, paymentController.downloadBundleReceipt);

module.exports = router;