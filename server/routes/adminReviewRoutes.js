const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Course = require('../models/Course');
const User = require('../models/User');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Get socket service from app
const getSocketService = (req) => {
  return req.app.get('socketService');
};

// GET /api/admin/reviews - Get all reviews with filtering
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      rating, 
      courseId, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (rating) filter.rating = parseInt(rating);
    if (courseId) filter.courseId = courseId;
    
    if (search) {
      filter.$or = [
        { 'comment': { $regex: search, $options: 'i' } },
        { 'title': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find(filter)
      .populate('userId', 'name email')
      .populate('courseId', 'title')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PATCH /api/admin/reviews/:id/approve - Approve a review
router.patch('/:id/approve', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndUpdate(
      id,
      { 
        status: 'approved',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name email')
     .populate('courseId', 'title');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Emit Socket.IO event for real-time update
    const socketService = getSocketService(req);
    if (socketService) {
      socketService.broadcastContentUpdate('REVIEW_APPROVED', {
        review: {
          id: review._id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          courseId: review.courseId._id,
          courseTitle: review.courseId.title,
          userId: review.userId._id,
          userName: review.userId.name,
          status: review.status
        },
        message: `Review for "${review.courseId.title}" has been approved`
      });
    }

    res.json({
      success: true,
      message: 'Review approved successfully',
      data: review
    });

  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PATCH /api/admin/reviews/:id/reject - Reject a review
router.patch('/:id/reject', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndUpdate(
      id,
      { 
        status: 'rejected',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name email')
     .populate('courseId', 'title');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Emit Socket.IO event for real-time update
    const socketService = getSocketService(req);
    if (socketService) {
      socketService.broadcastContentUpdate('REVIEW_REJECTED', {
        review: {
          id: review._id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          courseId: review.courseId._id,
          courseTitle: review.courseId.title,
          userId: review.userId._id,
          userName: review.userId.name,
          status: review.status
        },
        message: `Review for "${review.courseId.title}" has been rejected`
      });
    }

    res.json({
      success: true,
      message: 'Review rejected successfully',
      data: review
    });

  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PATCH /api/admin/reviews/:id/feature - Toggle featured status
router.patch('/:id/feature', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;

    const review = await Review.findByIdAndUpdate(
      id,
      { 
        featured: featured,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name email')
     .populate('courseId', 'title');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: featured ? 'Review featured successfully' : 'Review unfeatured successfully',
      data: review
    });

  } catch (error) {
    console.error('Error toggling featured status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PATCH /api/admin/reviews/:id/pin - Toggle pinned status (per course)
router.patch('/:id/pin', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { pinned } = req.body;

    const review = await Review.findByIdAndUpdate(
      id,
      { 
        pinned: pinned,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name email')
     .populate('courseId', 'title');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: pinned ? 'Review pinned successfully' : 'Review unpinned successfully',
      data: review
    });

  } catch (error) {
    console.error('Error toggling pinned status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE /api/admin/reviews/:id - Delete any review
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Emit Socket.IO event for real-time update
    const socketService = getSocketService(req);
    if (socketService) {
      socketService.broadcastContentUpdate('REVIEW_DELETED', {
        review: {
          id: review._id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          courseId: review.courseId?._id,
          userId: review.userId?._id,
          userName: review.userId?.name || 'Unknown User'
        },
        courseId: review.courseId?._id,
        message: `Review deleted from course`
      });
      
      console.log('📢 [deleteReview] Emitting REVIEW_DELETED event');
    } else {
      console.warn('⚠️ [deleteReview] Socket.IO service not available');
    }

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

// GET /api/admin/reviews/stats - Get review statistics
router.get('/stats', adminAuthMiddleware, async (req, res) => {
  try {
    const stats = await Review.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const ratingStats = await Review.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalReviews = await Review.countDocuments();
    const featuredCount = await Review.countDocuments({ featured: true });

    res.json({
      success: true,
      data: {
        byStatus: stats,
        byRating: ratingStats,
        totalReviews,
        featuredCount
      }
    });

  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PATCH /api/admin/reviews/:id/reply - Admin/Instructor reply to a review (one reply per review, max 150 characters)
router.patch('/:id/reply', adminAuthMiddleware, async (req, res) => {
  try {
    const { reply } = req.body;
    const reviewId = req.params.id;
    
    if (!reply || reply.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Reply text is required'
      });
    }

    // Check if review exists
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if reply already exists (only one reply per review)
    if (review.adminReply && review.adminReply.trim() !== '') {
      return res.status(400).json({
        success: false,
        message: 'A reply has already been submitted for this review. Only one reply per review is allowed.'
      });
    }

    // Validate character count (max 150 characters)
    const trimmedReply = reply.trim();
    if (trimmedReply.length > 150) {
      return res.status(400).json({
        success: false,
        message: `Reply exceeds maximum character limit. Current: ${trimmedReply.length} characters, Maximum: 150 characters`
      });
    }

    if (trimmedReply.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply text is required'
      });
    }
    
    // Find and update review with admin reply
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { 
        adminReply: trimmedReply,
        adminReplyAt: new Date(),
        updatedAt: new Date()
      },
      { new: true, runValidators: false }
    ).populate('userId', 'name email')
     .populate('courseId', 'title');
    
    if (!updatedReview) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    console.log('✅ Admin reply added to review:', reviewId);
    
    // Emit Socket.IO event for real-time update
    const socketService = getSocketService(req);
    if (socketService) {
      socketService.broadcastContentUpdate('REVIEW_REPLY_ADDED', {
        review: {
          id: updatedReview._id,
          rating: updatedReview.rating,
          title: updatedReview.title,
          comment: updatedReview.comment,
          adminReply: updatedReview.adminReply,
          adminReplyAt: updatedReview.adminReplyAt,
          courseId: updatedReview.courseId._id,
          courseTitle: updatedReview.courseId.title,
          userId: updatedReview.userId._id,
          userName: updatedReview.userId.name
        },
        message: `Admin replied to review for "${updatedReview.courseId.title}"`
      });
    }
    
    res.json({
      success: true,
      message: 'Reply added successfully',
      data: updatedReview
    });
  } catch (error) {
    console.error('Error adding admin reply:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding reply',
      error: error.message
    });
  }
});

module.exports = router;
