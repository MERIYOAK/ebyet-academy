const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const contactController = require('../controllers/contactController');

/**
 * Contact Routes
 * Handles contact form related endpoints
 */

// Rate limiting for contact form (prevent spam)
const contactFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many contact form submissions. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Submit contact form (with rate limiting)
router.post('/submit', contactFormLimiter, contactController.submitContactForm);

// Get contact form status (for testing)
router.get('/status', contactController.getContactFormStatus);

// Send test email (for development/testing SendGrid)
router.post('/test-email', contactController.sendTestEmail);

module.exports = router;
