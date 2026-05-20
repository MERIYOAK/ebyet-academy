const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Course = require('../models/Course');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// POST /api/reviews - Create a new review (users who purchased the course)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { courseId, rating, title, comment } = req.body;
    const userId = req.user?.id;
    
    
    if (!userId) {
      console.error('âŒ User ID is undefined:', { user: req.user, userId });
      return res.status(401).json({
        success: false,
        message: 'User authentication failed - no user ID found'
      });
    }

    // Validate required fields
    if (!courseId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, rating, and comment are required'
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has purchased the course
    if (!user.purchasedCourses || !user.purchasedCourses.includes(courseId)) {
      return res.status(403).json({
        success: false,
        message: 'You must purchase this course before leaving a review'
      });
    }


    // Check if user already reviewed this course
    const existingReview = await Review.findOne({ userId, courseId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this course. Only one review per course is allowed.'
      });
    }

    // Create new review
    const review = new Review({
      userId,
      courseId,
      rating,
      title: title?.trim(),
      comment: comment.trim(),
      status: 'pending' // Requires admin approval
    });

    await review.save();

    // Notify admin views that a new review is pending moderation
    try {
      const socketService = req.app.get('socketService');
      if (socketService) {
        socketService.broadcastContentUpdate('NEW_REVIEW', {
          review: {
            id: review._id,
            courseId: review.courseId,
            rating: review.rating,
            status: review.status
          },
          courseId: review.courseId.toString(),
          message: 'A new review has been submitted'
        });
      }
    } catch (socketError) {
      console.warn('Failed to broadcast NEW_REVIEW:', socketError);
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be visible after admin approval.',
      data: review
    });

  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/reviews/course/:courseId - Get approved reviews for a course
router.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { sort = 'newest' } = req.query;


    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }


    // First, let's check all reviews for this course (for debugging)
    const allReviews = await Review.find({ courseId });
    allReviews.forEach(review => {
    });

    // Check only approved reviews
    const approvedReviews = await Review.find({ courseId, status: 'approved' });
    approvedReviews.forEach(review => {
    });

    // Build sort query
    let sortQuery = {};
    if (sort === 'highest') {
      sortQuery = { rating: -1, createdAt: -1 };
    } else {
      sortQuery = { pinned: -1, createdAt: -1 }; // newest first, pinned on top
    }

    // Get approved reviews only
    const reviews = await Review.find({ courseId, status: 'approved' })
      .populate('userId', 'name email')
      .sort(sortQuery);


    // Calculate average rating using aggregation
    let stats = await Review.aggregate([
      { $match: { courseId: courseId, status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);


    // Fallback calculation if aggregation fails or returns empty
    if (!stats || stats.length === 0) {
      const allReviews = await Review.find({ courseId, status: 'approved' });
      const totalReviews = allReviews.length;
      const averageRating = totalReviews > 0 
        ? allReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0;
      
      stats = [{ averageRating, totalReviews }];
    }

    const { averageRating = 0, totalReviews = 0 } = stats[0] || {};
    
    // Ensure stats are properly formatted
    const formattedStats = {
      averageRating: Math.round((averageRating || 0) * 10) / 10, // Round to 1 decimal
      totalReviews: totalReviews || 0
    };
    

    res.json({
      success: true,
      data: {
        reviews,
        stats: formattedStats
      }
    });

  } catch (error) {
    console.error('âŒ Error fetching course reviews:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      courseId: req.params.courseId
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to fetch reviews'
    });
  }
});

// GET /api/reviews/featured - Get featured reviews for home page
router.get('/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const featuredReviews = await Review.find({ 
      status: 'approved', 
      featured: true 
    })
      .populate('userId', 'name email')
      .populate('courseId', 'title')
      .sort({ pinned: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: featuredReviews
    });

  } catch (error) {
    console.error('Error fetching featured reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/reviews/user/:userId - Get user's reviews (for their profile)
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;

    // Users can only see their own reviews
    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const reviews = await Review.find({ userId })
      .populate('courseId', 'title thumbnailURL')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reviews
    });

  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// NOTE: Users cannot edit or delete their own reviews. Review moderation
// (approve / reject / reply / delete) is performed exclusively by admins
// via the routes in adminReviewRoutes.js.

// TEMPORARY: Create test approved reviews (for testing only)
router.post('/test-create/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Create some test approved reviews
    const testReviews = [
      {
        userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Dummy user ID
        courseId: courseId,
        rating: 5,
        comment: 'Excellent course! Very comprehensive and well-structured.',
        status: 'approved'
      },
      {
        userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'), // Dummy user ID
        courseId: courseId,
        rating: 4,
        comment: 'Great content, learned a lot. Would recommend to others.',
        status: 'approved'
      },
      {
        userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'), // Dummy user ID
        courseId: courseId,
        rating: 3,
        comment: 'Good course, but could use more practical examples.',
        status: 'approved'
      }
    ];

    // Clear existing reviews for this course
    await Review.deleteMany({ courseId });
    
    // Insert test reviews
    const insertedReviews = await Review.insertMany(testReviews);
    
    
    res.json({
      success: true,
      message: `Created ${insertedReviews.length} test approved reviews`,
      data: insertedReviews
    });
  } catch (error) {
    console.error('Error creating test reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating test reviews',
      error: error.message
    });
  }
});

module.exports = router;