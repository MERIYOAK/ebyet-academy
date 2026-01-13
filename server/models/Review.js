const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 250
  },
  adminReply: {
    type: String,
    trim: true,
    maxlength: 150 // Maximum 150 characters
  },
  adminReplyAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  featured: {
    type: Boolean,
    default: false
  },
  pinned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one review per user per course
reviewSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Indexes for admin queries
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ featured: 1, status: 1 });
reviewSchema.index({ courseId: 1, status: 1 });

// Pre-save middleware to update timestamps
reviewSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Review', reviewSchema);
