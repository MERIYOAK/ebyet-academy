const emailService = require('../services/emailService');

/**
 * Contact Controller
 * Handles contact form submissions
 */
class ContactController {
  /**
   * Submit contact form
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async submitContactForm(req, res) {
    try {
      const { name, email, subject, message } = req.body;

      // Validate required fields
      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      // Validate input lengths
      if (name.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Name must be less than 100 characters'
        });
      }

      if (subject.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Subject must be less than 200 characters'
        });
      }

      if (message.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Message must be less than 2000 characters'
        });
      }

      // Sanitize inputs (XSS prevention and spam protection)
      const sanitizedData = {
        name: name.trim().replace(/<[^>]*>/g, '').substring(0, 100),
        email: email.trim().toLowerCase().substring(0, 255),
        subject: subject.trim().replace(/<[^>]*>/g, '').substring(0, 200),
        message: message.trim().replace(/<[^>]*>/g, '').substring(0, 2000)
      };

      // Send email
      const emailSent = await emailService.sendContactFormEmail(sanitizedData);

      if (emailSent) {
        console.log(`✅ Contact form submitted successfully from: ${sanitizedData.email}`);
        
        return res.status(200).json({
          success: true,
          message: 'Thank you for your message! We will get back to you soon.'
        });
      } else {
        console.log(`❌ Failed to send contact form email from: ${sanitizedData.email}`);
        
        return res.status(500).json({
          success: false,
          message: 'Sorry, there was an error sending your message. Please try again later.'
        });
      }

    } catch (error) {
      console.error('❌ Contact form submission error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Sorry, there was an error processing your request. Please try again later.'
      });
    }
  }

  /**
   * Get contact form status (for testing)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getContactFormStatus(req, res) {
    try {
      const isEmailConfigured = emailService.isEmailConfigured();
      
      return res.status(200).json({
        success: true,
        emailConfigured: isEmailConfigured,
        recipientEmail: process.env.CONTACT_FORM_RECIPIENT || 'ibyet.course@gmail.com',
        message: isEmailConfigured 
          ? 'Contact form is ready to receive submissions'
          : 'Contact form is not configured - emails will not be sent'
      });

    } catch (error) {
      console.error('❌ Contact form status error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Error checking contact form status'
      });
    }
  }

  /**
   * Send a test email (for development/testing)
   * POST /api/contact/test-email
   * Body: { "email": "your-email@example.com" }
   */
  async sendTestEmail(req, res) {
    try {
      const { email } = req.body;

      // Validate email format
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      const result = await emailService.sendTestEmail(email);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          service: result.service
        });
      } else {
        return res.status(500).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }

    } catch (error) {
      console.error('❌ Test email error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Error sending test email',
        error: error.message
      });
    }
  }
}

module.exports = new ContactController();
