const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

/**
 * Contact Routes
 * Handles contact form related endpoints
 */

// Submit contact form
router.post('/submit', contactController.submitContactForm);

// Get contact form status (for testing)
router.get('/status', contactController.getContactFormStatus);

module.exports = router;
