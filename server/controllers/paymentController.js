const { createCheckoutSession, stripe, verifyWebhook } = require('../utils/stripe');
const Course = require('../models/Course');
const Bundle = require('../models/Bundle');
const User = require('../models/User');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const { getEnglishText } = require('../utils/bilingualHelper');

/**
 * Create a Stripe checkout session for course or bundle purchase
 * POST /api/payments/create-checkout-session
 * Body: { courseId } OR { bundleId }
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    console.log('🔧 Creating checkout session...');
    console.log(`   - User ID: ${req.user?.userId || req.user?._id || 'undefined'}`);
    console.log(`   - User Email: ${req.user?.email || 'undefined'}`);
    console.log(`   - Request Body:`, req.body);

    // Validate user authentication
    if (!req.user || (!req.user.userId && !req.user._id)) {
      console.log('❌ User not authenticated or invalid user data');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const { courseId, bundleId } = req.body;
    
    if (!courseId && !bundleId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either courseId or bundleId is required' 
      });
    }

    if (courseId && bundleId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot purchase both course and bundle in one session' 
      });
    }

    // Get user ID from token (handle both userId and _id formats)
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ User not found in database: ${userId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Initialize arrays if they don't exist
    if (!user.purchasedCourses) user.purchasedCourses = [];
    if (!user.purchasedBundles) user.purchasedBundles = [];

    let course, bundle, itemId, itemType, successUrl, cancelUrl;

    if (courseId) {
      // Handle course purchase
      course = await Course.findById(courseId);
      if (!course) {
        console.log(`❌ Course not found: ${courseId}`);
        return res.status(404).json({ 
          success: false, 
          message: 'Course not found' 
        });
      }

      if (user.purchasedCourses.includes(courseId)) {
        console.log(`⚠️  User already purchased this course`);
        return res.status(400).json({ 
          success: false, 
          message: 'You already own this course' 
        });
      }

      // Normalize frontend URL to ensure it has proper protocol
      const normalizeUrl = (url) => {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return `https://${url}`;
        }
        return url;
      };

      itemId = courseId;
      itemType = 'course';
      successUrl = `${normalizeUrl(process.env.CLIENT_URL || 'www.ibyet.com')}/checkout/success?courseId=${courseId}`;
      cancelUrl = `${normalizeUrl(process.env.CLIENT_URL || 'www.ibyet.com')}/checkout/cancel?courseId=${courseId}`;
      console.log(`✅ Course found: ${course.title} ($${course.price})`);

    } else if (bundleId) {
      // Handle bundle purchase
      bundle = await Bundle.findById(bundleId);
      if (!bundle) {
        console.log(`❌ Bundle not found: ${bundleId}`);
        return res.status(404).json({ 
          success: false, 
          message: 'Bundle not found' 
        });
      }

      if (user.purchasedBundles.includes(bundleId)) {
        console.log(`⚠️  User already purchased this bundle`);
        return res.status(400).json({ 
          success: false, 
          message: 'You already own this bundle' 
        });
      }

      itemId = bundleId;
      itemType = 'bundle';
      successUrl = `${normalizeUrl(process.env.CLIENT_URL || 'www.ibyet.com')}/checkout/success?bundleId=${bundleId}`;
      cancelUrl = `${normalizeUrl(process.env.CLIENT_URL || 'www.ibyet.com')}/checkout/cancel?bundleId=${bundleId}`;
      console.log(`✅ Bundle found: ${bundle.title} ($${bundle.price})`);
    }

    // If Stripe is not configured, mark as purchased immediately (development mode)
    if (!stripe) {
      console.log('⚠️  Stripe not configured - marking as purchased in development mode');
      
      if (course) {
        // Add course to user's purchased courses
        await User.findByIdAndUpdate(userId, { $addToSet: { purchasedCourses: courseId } });
        // Enroll the student in the course
        await course.enrollStudent(userId);
        console.log(`✅ Student enrolled in course: ${course.title}`);
        
        const devPaymentData = {
          userId: userId,
          courseId: courseId,
          stripeSessionId: `dev_session_${Date.now()}`,
          amount: course.price,
          currency: 'usd',
          status: 'completed',
          paymentMethod: 'card',
          metadata: {
            userEmail: req.user.email,
            courseTitle: getEnglishText(course.title),
            paymentDate: new Date()
          }
        };
        await Payment.findOneAndUpdate(
          { userId: userId, courseId: courseId, status: 'completed' },
          devPaymentData,
          { upsert: true, new: true }
        );
      } else if (bundle) {
        // Add bundle to user's purchased bundles
        await User.findByIdAndUpdate(userId, { $addToSet: { purchasedBundles: bundleId } });
        // Enroll the student in the bundle
        await bundle.enrollStudent(userId);
        // Add all bundle courses to user's purchased courses
        await User.findByIdAndUpdate(userId, { $addToSet: { purchasedCourses: { $each: bundle.courseIds } } });
        // Enroll in all courses in the bundle
        for (const courseIdInBundle of bundle.courseIds) {
          const courseInBundle = await Course.findById(courseIdInBundle);
          if (courseInBundle) {
            try {
              await courseInBundle.enrollStudent(userId);
            } catch (err) {
              // Already enrolled, skip
              console.log(`⚠️  User already enrolled in course: ${courseInBundle.title}`);
            }
          }
        }
        console.log(`✅ Student enrolled in bundle: ${bundle.title}`);
        
        const devPaymentData = {
          userId: userId,
          bundleId: bundleId,
          stripeSessionId: `dev_session_${Date.now()}`,
          amount: bundle.price,
          currency: 'usd',
          status: 'completed',
          paymentMethod: 'card',
          metadata: {
            userEmail: req.user.email,
            bundleTitle: getEnglishText(bundle.title),
            paymentDate: new Date()
          }
        };
        await Payment.findOneAndUpdate(
          { userId: userId, bundleId: bundleId, status: 'completed' },
          devPaymentData,
          { upsert: true, new: true }
        );
      }
      
      return res.json({ 
        success: true,
        url: successUrl,
        message: `${itemType === 'course' ? 'Course' : 'Bundle'} purchased successfully (development mode)`
      });
    }

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      user: req.user,
      course,
      bundle,
      successUrl,
      cancelUrl,
    });

    console.log(`✅ Stripe session created: ${session.id}`);

    res.json({ 
      success: true,
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create checkout session',
      error: error.message 
    });
  }
};

/**
 * Handle Stripe webhook events
 * POST /api/payment/webhook
 */
exports.webhook = async (req, res) => {
  console.log('🔧 Webhook received...');
  console.log(`   - Path: ${req.path}`);
  console.log(`   - Method: ${req.method}`);
  console.log(`   - Headers:`, req.headers);
  console.log(`   - Body length:`, req.body ? req.body.length : 'No body');
  console.log(`   - Body type:`, typeof req.body);
  console.log(`   - Is Buffer:`, Buffer.isBuffer(req.body));
  console.log(`   - Body preview:`, req.body ? req.body.toString().substring(0, 100) + '...' : 'No body');
  console.log(`   - NODE_ENV:`, process.env.NODE_ENV);
  console.log(`   - STRIPE_SECRET_KEY:`, process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set');
  console.log(`   - STRIPE_WEBHOOK_SECRET:`, process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set');
  console.log(`   - User-Agent:`, req.headers['user-agent']);
  console.log(`   - CF-Connecting-IP:`, req.headers['cf-connecting-ip']);
  console.log(`   - X-Forwarded-For:`, req.headers['x-forwarded-for']);

  let event;

  try {
    // Verify webhook signature
    console.log('🔧 Calling verifyWebhook function...');
    event = verifyWebhook(req);
    console.log(`✅ Webhook verified: ${event.type}`);
    console.log(`✅ Event data:`, JSON.stringify(event, null, 2));
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    console.error('   - Error details:', error.message);
    console.error('   - Body available:', !!req.body);
    console.error('   - Stripe signature header:', req.headers['stripe-signature'] ? 'Present' : 'Missing');
    return res.status(400).json({ 
      error: 'Webhook signature verification failed',
      message: error.message,
      details: {
        hasBody: !!req.body,
        hasSignature: !!req.headers['stripe-signature'],
        environment: process.env.NODE_ENV
      }
    });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        console.log('✅ Payment succeeded:', event.data.object.id);
        break;
      
      case 'payment_intent.created':
        console.log('✅ Payment intent created:', event.data.object.id);
        break;
      
      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', event.data.object.id);
        break;
      
      default:
        console.log(`⚠️  Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Webhook processing failed',
      error: error.message 
    });
  }
};

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutSessionCompleted(session) {
  console.log('🔧 Processing checkout session completion...');
  console.log(`   - Session ID: ${session.id}`);
  console.log(`   - Customer Email: ${session.customer_email}`);
  console.log(`   - Metadata:`, session.metadata);

  try {
    const { userId, courseId, bundleId, userEmail, type } = session.metadata;

    if (!userId || (!courseId && !bundleId)) {
      throw new Error('Missing userId or item ID (courseId/bundleId) in session metadata');
    }

    const itemType = type || (bundleId ? 'bundle' : 'course');
    const itemId = bundleId || courseId;

    // Update user's purchased items
    const updateQuery = itemType === 'bundle' 
      ? { $addToSet: { purchasedBundles: bundleId } }
      : { $addToSet: { purchasedCourses: courseId } };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateQuery,
      { new: true }
    );

    if (!updatedUser) {
      throw new Error(`User not found: ${userId}`);
    }

    let paymentData;

    if (itemType === 'bundle') {
      // Handle bundle purchase
      const bundle = await Bundle.findById(bundleId);
      if (!bundle) {
        throw new Error(`Bundle not found: ${bundleId}`);
      }

      // Enroll the student in the bundle
      await bundle.enrollStudent(userId);
      console.log(`✅ Student enrolled in bundle: ${bundle.title}`);

      // Add all bundle courses to user's purchased courses
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { purchasedCourses: { $each: bundle.courseIds } } }
      );

      // Enroll in all courses in the bundle
      for (const courseIdInBundle of bundle.courseIds) {
        const courseInBundle = await Course.findById(courseIdInBundle);
        if (courseInBundle) {
          try {
            await courseInBundle.enrollStudent(userId);
          } catch (err) {
            // Already enrolled, skip
            console.log(`⚠️  User already enrolled in course: ${courseInBundle.title}`);
          }
        }
      }

      paymentData = {
        userId: userId,
        bundleId: bundleId,
        stripeSessionId: session.id,
        amount: session.amount_total / 100,
        currency: session.currency,
        status: 'completed',
        paymentMethod: 'card',
        metadata: {
          userEmail: userEmail,
          bundleTitle: getEnglishText(bundle.title),
          paymentDate: new Date()
        }
      };

      console.log(`✅ Bundle access granted successfully`);
      console.log(`   - User: ${updatedUser.email}`);
      console.log(`   - Bundle: ${bundle.title}`);
      console.log(`   - Total purchased bundles: ${updatedUser.purchasedBundles?.length || 0}`);
      console.log(`   - Payment recorded: $${paymentData.amount}`);

    } else {
      // Handle course purchase
      const course = await Course.findById(courseId);
      if (!course) {
        throw new Error(`Course not found: ${courseId}`);
      }

      // Enroll the student in the course (increments totalEnrollments)
      await course.enrollStudent(userId);
      console.log(`✅ Student enrolled in course: ${course.title}`);
      console.log(`   - New enrollment count: ${course.totalEnrollments}`);

      paymentData = {
        userId: userId,
        courseId: courseId,
        stripeSessionId: session.id,
        amount: session.amount_total / 100,
        currency: session.currency,
        status: 'completed',
        paymentMethod: 'card',
        metadata: {
          userEmail: userEmail,
          courseTitle: getEnglishText(course.title),
          paymentDate: new Date()
        }
      };

      console.log(`✅ Course access granted successfully`);
      console.log(`   - User: ${updatedUser.email}`);
      console.log(`   - Course: ${course.title}`);
      console.log(`   - Total purchased courses: ${updatedUser.purchasedCourses.length}`);
      console.log(`   - Payment recorded: $${paymentData.amount}`);
    }

    // Create or update payment record
    await Payment.findOneAndUpdate(
      { stripeSessionId: session.id },
      paymentData,
      { upsert: true, new: true }
    );

  } catch (error) {
    console.error('❌ Error processing checkout completion:', error);
    throw error;
  }
}

/**
 * Success page handler
 * GET /api/payments/success
 */
exports.success = (req, res) => {
  console.log('🔧 Payment success page accessed');
  console.log(`   - Query params:`, req.query);
  
  res.json({ 
    success: true,
    message: 'Payment successful! You now have access to the course.',
    courseId: req.query.courseId
  });
};

/**
 * Cancel page handler
 * GET /api/payments/cancel
 */
exports.cancel = (req, res) => {
  console.log('🔧 Payment cancelled');
  console.log(`   - Query params:`, req.query);
  
  res.json({ 
    success: false,
    message: 'Payment was cancelled. You can try again anytime.',
    courseId: req.query.courseId
  });
};

/**
 * Check if user has purchased a course
 * GET /api/payment/check-purchase/:courseId
 */
exports.checkPurchase = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Validate user authentication
    if (!req.user || (!req.user.userId && !req.user._id)) {
      console.log('❌ User not authenticated in checkPurchase');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // Get user ID from token (handle both userId and _id formats)
    const userId = req.user.userId || req.user._id;

    console.log(`🔧 Checking purchase status...`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Course ID: ${courseId}`);

    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ User not found in database: ${userId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Initialize purchasedCourses array if it doesn't exist
    if (!user.purchasedCourses) {
      user.purchasedCourses = [];
      await user.save();
    }

    const hasPurchased = user.purchasedCourses.some(purchasedId => 
      purchasedId.toString() === courseId || purchasedId === courseId
    );
    
    console.log(`✅ Purchase check completed: ${hasPurchased}`);

    res.json({ 
      success: true,
      data: {
        hasPurchased,
        courseId
      }
    });

  } catch (error) {
    console.error('❌ Error checking purchase status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check purchase status',
      error: error.message 
    });
  }
}; 

/**
 * Get payment receipt information
 * GET /api/payment/receipt/:courseId
 */
exports.getReceipt = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Validate user authentication
    if (!req.user || (!req.user.userId && !req.user._id)) {
      console.log('❌ User not authenticated in getReceipt');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // Get user ID from token (handle both userId and _id formats)
    const userId = req.user.userId || req.user._id;

    console.log(`🔧 Getting receipt for payment...`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Course ID: ${courseId}`);

    // Validate courseId format
    if (!courseId || courseId === 'undefined' || courseId === 'null') {
      console.log('❌ Invalid course ID provided:', courseId);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid course ID' 
      });
    }

    // Validate courseId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log('❌ Invalid MongoDB ObjectId format:', courseId);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid course ID format' 
      });
    }

    // Find the payment record
    let payment = await Payment.findOne({
      userId: userId,
      courseId: courseId,
      status: 'completed'
    }).populate('courseId', 'title description');

    // If no payment record exists, check if user has purchased the course
    if (!payment) {
      console.log(`⚠️  No payment record found, checking if user owns the course...`);
      
      const user = await User.findById(userId);
      if (!user) {
        console.log(`❌ User not found: ${userId}`);
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      if (!user.purchasedCourses || !user.purchasedCourses.includes(courseId)) {
        console.log(`❌ User ${userId} has not purchased course ${courseId}`);
        return res.status(404).json({ 
          success: false, 
          message: 'Payment not found. The course may not have been purchased yet or the payment is still processing.' 
        });
      }

      // User owns the course but no payment record exists (development mode or webhook failed)
      console.log(`✅ User owns course but no payment record - creating fallback receipt`);
      
      const course = await Course.findById(courseId);
      if (!course) {
        console.log(`❌ Course not found: ${courseId}`);
        return res.status(404).json({ 
          success: false, 
          message: 'Course not found' 
        });
      }

      // Create a fallback payment record
      const fallbackPaymentData = {
        userId: userId,
        courseId: courseId,
        stripeSessionId: `fallback_${Date.now()}`,
        amount: course.price,
        currency: 'usd',
        status: 'completed',
        paymentMethod: 'card',
        metadata: {
          userEmail: user.email,
          courseTitle: course.title,
          paymentDate: new Date()
        }
      };

      payment = new Payment(fallbackPaymentData);
      await payment.save();
      
      console.log(`✅ Fallback payment record created: $${payment.amount}`);
    }

    // Format receipt data
    const receipt = {
      orderId: payment._id.toString().slice(-8).toUpperCase(),
      courseTitle: payment.metadata.courseTitle,
      amount: payment.amount,
      currency: payment.currency.toUpperCase(),
      paymentDate: payment.createdAt,
      paymentMethod: payment.paymentMethod,
      userEmail: payment.metadata.userEmail,
      status: payment.status
    };

    console.log(`✅ Receipt generated for payment ${payment._id}`);

    res.json({ 
      success: true,
      receipt
    });

  } catch (error) {
    console.error('❌ Error getting receipt:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get receipt information',
      error: error.message 
    });
  }
};

/**
 * Get bundle receipt information
 * GET /api/payment/receipt/bundle/:bundleId
 */
exports.getBundleReceipt = async (req, res) => {
  try {
    const { bundleId } = req.params;
    
    // Validate user authentication
    if (!req.user || (!req.user.userId && !req.user._id)) {
      console.log('❌ User not authenticated in getBundleReceipt');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // Get user ID from token (handle both userId and _id formats)
    const userId = req.user.userId || req.user._id;

    console.log(`🔧 Getting bundle receipt info...`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Bundle ID: ${bundleId}`);

    // Get user info first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Find bundle payment record
    let payment = await Payment.findOne({
      userId: userId,
      bundleId: bundleId,
      status: 'completed'
    }).populate('bundleId', 'title description');

    // If no payment record exists, check if user has purchased bundle
    if (!payment) {
      console.log(`⚠️  No bundle payment record found, checking if user owns bundle...`);
      
      if (!user.purchasedBundles || !user.purchasedBundles.includes(bundleId)) {
        console.log(`❌ User ${userId} has not purchased bundle ${bundleId}`);
        return res.status(404).json({ 
          success: false, 
          message: 'Bundle payment not found' 
        });
      }

      // User owns the bundle but no payment record exists (development mode or webhook failed)
      console.log(`✅ User owns bundle but no payment record - creating fallback receipt`);
      
      const bundle = await Bundle.findById(bundleId);
      if (!bundle) {
        return res.status(404).json({ 
          success: false, 
          message: 'Bundle not found' 
        });
      }

      // Create a fallback payment record
      const fallbackPaymentData = {
        userId: userId,
        bundleId: bundleId,
        stripeSessionId: `fallback_${Date.now()}`,
        amount: bundle.price,
        currency: 'usd',
        status: 'completed',
        paymentMethod: 'card',
        metadata: {
          userEmail: user.email,
          bundleTitle: bundle.title,
          paymentDate: new Date()
        }
      };

      payment = new Payment(fallbackPaymentData);
      await payment.save();
    }

    // Return receipt information
    res.json({
      success: true,
      receipt: {
        type: 'bundle',
        bundleId: payment.bundleId._id,
        bundleTitle: payment.bundleId.title,
        bundleDescription: payment.bundleId.description,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        stripeSessionId: payment.stripeSessionId,
        createdAt: payment.createdAt,
        userEmail: user.email
      }
    });

  } catch (error) {
    console.error('❌ Error getting bundle receipt:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get bundle receipt information',
      error: error.message 
    });
  }
};

/**
 * Download bundle receipt as HTML
 * GET /api/payment/download-bundle-receipt/:bundleId
 */
exports.downloadBundleReceipt = async (req, res) => {
  try {
    const { bundleId } = req.params;
    
    // Validate user authentication
    if (!req.user || (!req.user.userId && !req.user._id)) {
      console.log('❌ User not authenticated in downloadBundleReceipt');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // Get user ID from token (handle both userId and _id formats)
    const userId = req.user.userId || req.user._id;

    console.log(`🔧 Downloading bundle receipt for payment...`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Bundle ID: ${bundleId}`);

    // Get user info first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Find bundle payment record
    let payment = await Payment.findOne({
      userId: userId,
      bundleId: bundleId,
      status: 'completed'
    }).populate('bundleId', 'title description');

    // If no payment record exists, check if user has purchased bundle
    if (!payment) {
      console.log(`⚠️  No bundle payment record found, checking if user owns bundle...`);
      
      if (!user.purchasedBundles || !user.purchasedBundles.includes(bundleId)) {
        console.log(`❌ User ${userId} has not purchased bundle ${bundleId}`);
        return res.status(404).json({ 
          success: false, 
          message: 'Bundle payment not found' 
        });
      }

      // User owns the bundle but no payment record exists (development mode or webhook failed)
      console.log(`✅ User owns bundle but no payment record - creating fallback receipt`);
      
      const bundle = await Bundle.findById(bundleId);
      if (!bundle) {
        return res.status(404).json({ 
          success: false, 
          message: 'Bundle not found' 
        });
      }

      // Create a fallback payment record
      const fallbackPaymentData = {
        userId: userId,
        bundleId: bundleId,
        stripeSessionId: `fallback_${Date.now()}`,
        amount: bundle.price,
        currency: 'usd',
        status: 'completed',
        paymentMethod: 'card',
        metadata: {
          userEmail: user.email,
          bundleTitle: bundle.title,
          paymentDate: new Date()
        }
      };

      payment = new Payment(fallbackPaymentData);
      await payment.save();
    }

    // Generate PDF receipt
    const receiptHtml = generateBundleReceiptPdf(payment, user);

    // Set headers for HTML download (PDF-optimized format)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bundle-receipt-${payment.stripeSessionId}.html"`);
    
    console.log(`✅ Bundle receipt generated for user ${userId}, bundle ${bundleId}`);
    res.send(receiptHtml);

  } catch (error) {
    console.error('❌ Error downloading bundle receipt:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to download bundle receipt' 
    });
  }
};

/**
 * Generate PDF receipt for bundle
 */
function generateBundleReceiptPdf(payment, user) {
  const bundle = payment.bundleId;
  const bundleTitle = getEnglishText(bundle.title);
  const bundleDescription = getEnglishText(bundle.description || 'Course Bundle');
  const paymentDate = new Date(payment.createdAt).toLocaleDateString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bundle Receipt - ${bundleTitle}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px; 
          line-height: 1.4;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #333; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .receipt-details { 
          margin-bottom: 30px; 
        }
        .item { 
          margin-bottom: 15px; 
          padding: 10px;
          background: #f9f9f9;
          border-radius: 4px;
        }
        .total { 
          font-size: 18px; 
          font-weight: bold; 
          margin-top: 20px; 
          background: #e8f5e8;
          padding: 15px;
          border-radius: 4px;
        }
        .footer { 
          text-align: center; 
          margin-top: 40px; 
          color: #666; 
          font-size: 14px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🧾 Bundle Receipt</h1>
        <h2>${bundleTitle}</h2>
        <p><strong>Receipt ID:</strong> ${payment.stripeSessionId}</p>
        <p><strong>Date:</strong> ${paymentDate}</p>
      </div>
      
      <div class="receipt-details">
        <div class="item">
          <strong>Bundle:</strong> ${bundleTitle}
        </div>
        <div class="item">
          <strong>Description:</strong> ${bundleDescription}
        </div>
        <div class="item">
          <strong>Student:</strong> ${user.firstName} ${user.lastName}
        </div>
        <div class="item">
          <strong>Email:</strong> ${user.email}
        </div>
        <div class="item">
          <strong>Payment Method:</strong> ${payment.paymentMethod || 'Credit Card'}
        </div>
        <div class="item">
          <strong>Amount Paid:</strong> $${(payment.amount / 100).toFixed(2)} USD
        </div>
        <div class="item">
          <strong>Status:</strong> <span style="color: #28a745;">Completed</span>
        </div>
      </div>
      
      <div class="total">
        <strong>Total Amount:</strong> $${(payment.amount / 100).toFixed(2)} USD
      </div>
      
      <div class="footer">
        <p>Thank you for your purchase! 🎓</p>
        <p>This is an official receipt for your records.</p>
        <p class="no-print">Generated on: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Download receipt as HTML (production-friendly alternative to PDF)
 * GET /api/payment/download-receipt/:courseId
 */
exports.downloadReceipt = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Validate user authentication
    if (!req.user || (!req.user.userId && !req.user._id)) {
      console.log('❌ User not authenticated in downloadReceipt');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // Get user ID from token (handle both userId and _id formats)
    const userId = req.user.userId || req.user._id;

    console.log(`🔧 Downloading receipt for payment...`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Course ID: ${courseId}`);

    // Get user info first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Find the payment record
    let payment = await Payment.findOne({
      userId: userId,
      courseId: courseId,
      status: 'completed'
    }).populate('courseId', 'title description');

    // If no payment record exists, check if user has purchased the course
    if (!payment) {
      console.log(`⚠️  No payment record found, checking if user owns the course...`);
      
      if (!user.purchasedCourses || !user.purchasedCourses.includes(courseId)) {
        console.log(`❌ User ${userId} has not purchased course ${courseId}`);
        return res.status(404).json({ 
          success: false, 
          message: 'Payment not found' 
        });
      }

      // User owns the course but no payment record exists (development mode or webhook failed)
      console.log(`✅ User owns course but no payment record - creating fallback receipt`);
      
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ 
          success: false, 
          message: 'Course not found' 
        });
      }

      // Create a fallback payment record
      const fallbackPaymentData = {
        userId: userId,
        courseId: courseId,
        stripeSessionId: `fallback_${Date.now()}`,
        amount: course.price,
        currency: 'usd',
        status: 'completed',
        paymentMethod: 'card',
        metadata: {
          userEmail: user.email,
          courseTitle: course.title,
          paymentDate: new Date()
        }
      };

      payment = new Payment(fallbackPaymentData);
      await payment.save();
      
      console.log(`✅ Fallback payment record created: $${payment.amount}`);
    }

    // Generate receipt PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment._id.toString().slice(-8)}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Generate PDF content
    await generateReceiptPDF(doc, payment, user);

    // Finalize PDF
    doc.end();

    console.log(`✅ Receipt PDF generated for payment ${payment._id}`);

  } catch (error) {
    console.error('❌ Error downloading receipt:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to download receipt',
      error: error.message 
    });
  }
};



/**
 * Generate receipt PDF
 */
async function generateReceiptPDF(doc, payment, user) {
  const orderId = payment._id.toString().slice(-8).toUpperCase();
  const paymentDate = payment.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Extract English text from course/bundle title
  let courseTitle = 'Course';
  if (payment.courseId?.title) {
    courseTitle = getEnglishText(payment.courseId.title);
  } else if (payment.bundleId) {
    // For bundles, we need to fetch the bundle to get the title
    const Bundle = require('../models/Bundle');
    const bundle = await Bundle.findById(payment.bundleId);
    if (bundle) {
      courseTitle = getEnglishText(bundle.title);
    } else if (payment.metadata?.bundleTitle) {
      courseTitle = getEnglishText(payment.metadata.bundleTitle);
    }
  } else if (payment.metadata?.courseTitle) {
    courseTitle = getEnglishText(payment.metadata.courseTitle);
  } else if (payment.metadata?.bundleTitle) {
    courseTitle = getEnglishText(payment.metadata.bundleTitle);
  }
  const amount = payment.amount || 0;
  const currency = (payment.currency || 'USD').toUpperCase();
  const userEmail = user?.email || payment.metadata?.userEmail || 'N/A';
  const paymentMethod = payment.paymentMethod || 'Credit Card';

  // Header
  doc.fontSize(24)
     .fillColor('#00BFFF')
     .text('Ibyet Investing', 50, 50, { align: 'center' });
  
  doc.fontSize(12)
     .fillColor('#666666')
     .text('Payment Receipt', 50, 80, { align: 'center' });

  // Receipt Details
  doc.fontSize(10)
     .fillColor('#000000')
     .moveDown(2);

  // Order ID
  doc.fontSize(12)
     .fillColor('#333333')
     .text('Order ID:', 50, doc.y)
     .fillColor('#000000')
     .text(orderId, 150, doc.y);
  
  doc.moveDown(1);

  // Payment Date
  doc.fillColor('#333333')
     .text('Payment Date:', 50, doc.y)
     .fillColor('#000000')
     .text(paymentDate, 150, doc.y);
  
  doc.moveDown(1);

  // Course/Bundle Title
  const itemLabel = payment.bundleId ? 'Bundle:' : 'Course:';
  doc.fillColor('#333333')
     .text(itemLabel, 50, doc.y)
     .fillColor('#000000')
     .text(courseTitle, 150, doc.y, { width: 400 });
  
  doc.moveDown(1);

  // Amount
  doc.fontSize(14)
     .fillColor('#333333')
     .text('Amount Paid:', 50, doc.y)
     .fillColor('#10b981')
     .fontSize(16)
     .text(`$${amount.toFixed(2)} ${currency}`, 150, doc.y);
  
  doc.moveDown(1);

  // Payment Method
  doc.fontSize(10)
     .fillColor('#333333')
     .text('Payment Method:', 50, doc.y)
     .fillColor('#000000')
     .text(paymentMethod, 150, doc.y);
  
  doc.moveDown(1);

  // Customer Email
  doc.fillColor('#333333')
     .text('Customer Email:', 50, doc.y)
     .fillColor('#000000')
     .text(userEmail, 150, doc.y);
  
  doc.moveDown(2);

  // Status
  doc.fontSize(12)
     .fillColor('#10b981')
     .text('✓ Payment Completed', 50, doc.y);

  doc.moveDown(3);

  // Footer
  doc.fontSize(8)
     .fillColor('#999999')
     .text('Thank you for your purchase!', 50, doc.y, { align: 'center' })
     .moveDown(0.5)
     .text('This is an official receipt for your records.', 50, doc.y, { align: 'center' })
     .moveDown(0.5)
     .text(`Receipt ID: ${orderId}`, 50, doc.y, { align: 'center' });
}

