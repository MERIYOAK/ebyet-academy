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
    
    console.log('📝 Review submission debug:', {
      userId,
      courseId,
      rating,
      userObject: req.user,
      headers: req.headers.authorization ? 'present' : 'missing'
    });
    
    if (!userId) {
      console.error('❌ User ID is undefined:', { user: req.user, userId });
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
      console.log('❌ User has not purchased this course:', { userId, courseId });
      return res.status(403).json({
        success: false,
        message: 'You must purchase this course before leaving a review'
      });
    }

    console.log('✅ User has purchased the course:', { userId, courseId });

    // Check if user already reviewed this course
    const existingReview = await Review.findOne({ userId, courseId });
    if (existingReview) {
      console.log('❌ User already reviewed this course:', { userId, courseId });
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
    console.log('✅ Review created successfully:', review._id);

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

    console.log('🔍 Fetching reviews for course:', courseId);

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      console.log('❌ Course not found:', courseId);
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    console.log('✅ Course found:', course.title);

    // First, let's check all reviews for this course (for debugging)
    const allReviews = await Review.find({ courseId });
    console.log(`📊 All reviews for course ${courseId}:`, allReviews.length);
    allReviews.forEach(review => {
      console.log(`  - Review ${review._id}: rating=${review.rating}, status=${review.status}`);
    });

    // Check only approved reviews
    const approvedReviews = await Review.find({ courseId, status: 'approved' });
    console.log(`✅ Approved reviews: ${approvedReviews.length}`);
    approvedReviews.forEach(review => {
      console.log(`  - Approved Review ${review._id}: rating=${review.rating}`);
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

    console.log(`📝 Found ${reviews.length} approved reviews`);

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

    console.log('📊 Aggregation result:', stats);

    // Fallback calculation if aggregation fails or returns empty
    if (!stats || stats.length === 0) {
      console.log('🔄 Using fallback calculation');
      const allReviews = await Review.find({ courseId, status: 'approved' });
      const totalReviews = allReviews.length;
      const averageRating = totalReviews > 0 
        ? allReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0;
      
      stats = [{ averageRating, totalReviews }];
      console.log('📊 Fallback stats calculated:', { averageRating, totalReviews });
    }

    const { averageRating = 0, totalReviews = 0 } = stats[0] || {};
    console.log(`📊 Final Stats: ${averageRating} avg rating, ${totalReviews} total reviews`);
    
    // Ensure stats are properly formatted
    const formattedStats = {
      averageRating: Math.round((averageRating || 0) * 10) / 10, // Round to 1 decimal
      totalReviews: totalReviews || 0
    };
    
    console.log('📊 Formatted stats:', formattedStats);

    res.json({
      success: true,
      data: {
        reviews,
        stats: formattedStats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching course reviews:', error);
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

// PATCH /api/reviews/:id - Update user's own review (sends back to pending)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user.id;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review
    if (review.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own reviews'
      });
    }

    // Update review and send back to pending
    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title?.trim();
    if (comment !== undefined) review.comment = comment.trim();
    review.status = 'pending'; // Requires re-approval
    review.updatedAt = new Date();

    await review.save();

    res.json({
      success: true,
      message: 'Review updated. It will be visible after approval.',
      data: review
    });

  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE /api/reviews/:id - Delete user's own review
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review
    if (review.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews'
      });
    }

    await Review.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

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
    
    console.log('✅ Test reviews created:', insertedReviews.length);
    
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
