const Newsletter = require('../models/Newsletter');
const emailService = require('../services/emailService');

// Subscribe to newsletter
exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email address is required' 
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

    // Check if email already exists
    const existingSubscriber = await Newsletter.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (existingSubscriber) {
      if (existingSubscriber.isSubscribed) {
        return res.status(200).json({ 
          success: true,
          message: 'You are already subscribed to our newsletter',
          data: { email: existingSubscriber.email }
        });
      } else {
        // Resubscribe
        existingSubscriber.isSubscribed = true;
        existingSubscriber.subscribedAt = new Date();
        existingSubscriber.unsubscribedAt = null;
        await existingSubscriber.save();

        return res.status(200).json({ 
          success: true,
          message: 'Successfully resubscribed to our newsletter',
          data: { email: existingSubscriber.email }
        });
      }
    }

    // Create new subscription
    const newSubscriber = new Newsletter({
      email: email.toLowerCase().trim(),
      isSubscribed: true,
      source: req.body.source || 'homepage'
    });

    await newSubscriber.save();

    res.status(201).json({ 
      success: true,
      message: 'Successfully subscribed to our newsletter',
      data: { email: newSubscriber.email }
    });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ 
        success: false,
        message: 'This email is already subscribed' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Failed to subscribe to newsletter',
      error: error.message 
    });
  }
};

// Unsubscribe from newsletter
exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email address is required' 
      });
    }

    const subscriber = await Newsletter.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!subscriber) {
      return res.status(404).json({ 
        success: false,
        message: 'Email not found in our newsletter list' 
      });
    }

    if (!subscriber.isSubscribed) {
      return res.status(200).json({ 
        success: true,
        message: 'You are already unsubscribed' 
      });
    }

    subscriber.isSubscribed = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.status(200).json({ 
      success: true,
      message: 'Successfully unsubscribed from newsletter' 
    });
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to unsubscribe from newsletter',
      error: error.message 
    });
  }
};

// Get all subscribers (admin only)
exports.getAllSubscribers = async (req, res) => {
  try {
    const { page = 1, limit = 50, subscribed } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (subscribed !== undefined) {
      query.isSubscribed = subscribed === 'true';
    }

    const subscribers = await Newsletter.find(query)
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Newsletter.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        subscribers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch subscribers',
      error: error.message 
    });
  }
};

// Send bulk email to all subscribers
exports.sendBulkEmail = async (req, res) => {
  try {
    const { subject, message, isHtml = true, onlySubscribed = true } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Subject and message are required' 
      });
    }

    // Check if email service is configured
    if (!emailService.isEmailConfigured()) {
      return res.status(503).json({ 
        success: false,
        message: 'Email service is not configured. Please configure SMTP settings.' 
      });
    }

    // Get all subscribers
    const query = onlySubscribed ? { isSubscribed: true } : {};
    const subscribers = await Newsletter.find(query).select('email');

    if (subscribers.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No subscribers found' 
      });
    }

    const emails = subscribers.map(s => s.email);

    // Send bulk email
    const results = await emailService.sendBulkEmail(emails, subject, message, isHtml);

    if (results.failed === emails.length) {
      return res.status(500).json({ 
        success: false,
        message: 'Failed to send emails to all subscribers',
        data: results
      });
    }

    res.status(200).json({ 
      success: true,
      message: `Email sent to ${results.success} out of ${emails.length} subscribers`,
      data: {
        total: emails.length,
        successful: results.success,
        failed: results.failed,
        errors: results.errors
      }
    });
  } catch (error) {
    console.error('Error sending bulk email:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send bulk email',
      error: error.message 
    });
  }
};

