const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
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
  videoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Video', 
    required: true 
  },
  
  // Video-level progress tracking
  watchedDuration: { type: Number, default: 0 }, // in seconds
  totalDuration: { type: Number, default: 0 }, // in seconds
  watchedPercentage: { type: Number, default: 0 }, // 0-100, real-time video progress
  isCompleted: { type: Boolean, default: false },
  completionPercentage: { type: Number, default: 0 }, // 0-100, for course-level tracking
  
  // Timestamps
  firstWatchedAt: { type: Date, default: Date.now },
  lastWatchedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  
  // Watch history for resume functionality
  watchHistory: [{
    timestamp: { type: Number }, // video timestamp in seconds
    watchedAt: { type: Date, default: Date.now }
  }],
  
  // Additional metadata
  watchCount: { type: Number, default: 1 },
  averageWatchTime: { type: Number, default: 0 }, // average time per session
  
}, { timestamps: true });

// Compound index for efficient queries
progressSchema.index({ userId: 1, courseId: 1, videoId: 1 }, { unique: true });
progressSchema.index({ userId: 1, courseId: 1 });
progressSchema.index({ userId: 1, isCompleted: 1 });

// Virtual for video progress percentage
progressSchema.virtual('videoProgressPercentage').get(function() {
  if (this.totalDuration === 0) return 0;
  return Math.min(100, Math.round((this.watchedDuration / this.totalDuration) * 100));
});

// Method to update video-level progress (real-time) - Udemy-style atomic update
progressSchema.methods.updateVideoProgress = function(watchedDuration, totalDuration, timestamp = null) {
  // Use atomic operations to prevent version conflicts
  const updateData = {
    $set: {
      totalDuration: totalDuration,
      lastWatchedAt: new Date(),
      watchedPercentage: this.videoProgressPercentage
    },
    $max: {
      watchedDuration: watchedDuration // Safe concurrent updates - only increase, never decrease
    },
    $inc: {
      watchCount: 1
    }
  };

  // STICKY COMPLETION LOGIC: Once completed, maintain 100% completion
  if (this.isCompleted) {
    updateData.$set.completionPercentage = 100;
    updateData.$set.watchedPercentage = 100;
    console.log(`🔒 [Progress] Video already completed, maintaining 100% completion status`);
  } else {
    // Only update completion percentage if not already completed
    updateData.$set.completionPercentage = this.videoProgressPercentage;
    
    // Mark as completed if watched 90% or more
    if (this.videoProgressPercentage >= 90 && !this.isCompleted) {
      updateData.$set.isCompleted = true;
      updateData.$set.completedAt = new Date();
      console.log(`✅ [Progress] Video marked as completed at ${this.videoProgressPercentage}%`);
    }
  }
  
  // Add to watch history if timestamp provided
  if (timestamp !== null) {
    updateData.$push = {
      watchHistory: {
        $each: [{
          timestamp: Math.round(timestamp),
          watchedAt: new Date()
        }],
        $slice: -10 // Keep only last 10 entries
      }
    };
  }
  
  // Use findOneAndUpdate for atomic operation without version conflicts
  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    updateData,
    { new: true, runValidators: true }
  );
};

// Method to get last watched position
progressSchema.methods.getLastPosition = function() {
  if (this.watchHistory.length === 0) return 0;
  return this.watchHistory[this.watchHistory.length - 1].timestamp;
};

// Static method to get user's course progress
progressSchema.statics.getCourseProgress = function(userId, courseId) {
  return this.find({ userId, courseId })
    .populate('videoId', 'title duration order')
    .sort({ 'videoId.order': 1 });
};

// Static method to get user's overall course progress (course-level)
progressSchema.statics.getOverallCourseProgress = async function(userId, courseId, totalVideos = null) {
  // CRITICAL: totalVideos must be provided and must be the actual total number of videos in the course
  if (!totalVideos || totalVideos === 0) {
    console.warn(`⚠️ [getOverallCourseProgress] totalVideos not provided or is 0 for course ${courseId}`);
    return {
      totalVideos: 0,
      completedVideos: 0,
      totalProgress: 0,
      lastWatchedVideo: null,
      lastWatchedPosition: 0,
      courseProgressPercentage: 0,
      totalWatchedDuration: 0,
      courseTotalDuration: 0
    };
  }
  
  const progressEntries = await this.find({ userId, courseId });
  
  // Create a map of videoId -> completionPercentage for quick lookup
  const progressMap = new Map();
  progressEntries.forEach(entry => {
    if (entry.videoId) {
      const videoId = entry.videoId.toString ? entry.videoId.toString() : entry.videoId;
      progressMap.set(videoId, {
        completionPercentage: entry.completionPercentage || 0,
        isCompleted: entry.isCompleted || false,
        watchedDuration: entry.watchedDuration || 0,
        totalDuration: entry.totalDuration || 0,
        lastWatchedAt: entry.lastWatchedAt
      });
    }
  });
  
  // Calculate course progress: sum of all video completion percentages / total videos
  // Videos without progress entries count as 0%
  // Cap individual video completion at 100% to prevent exceeding maximum
  const totalCompletionPercentage = progressEntries.reduce((sum, p) => {
    const completion = Math.min(100, p.completionPercentage || 0); // Cap at 100%
    return sum + completion;
  }, 0);
  
  // IMPORTANT: Divide by actual total videos (including videos with no progress)
  // Ensure we don't divide by zero and cap at 100% to prevent exceeding maximum
  if (totalVideos === 0) {
    console.warn(`⚠️ [getOverallCourseProgress] totalVideos is 0, cannot calculate progress`);
    return {
      totalVideos: 0,
      completedVideos: 0,
      totalProgress: 0,
      lastWatchedVideo: null,
      lastWatchedPosition: 0,
      courseProgressPercentage: 0,
      totalWatchedDuration: 0,
      courseTotalDuration: 0
    };
  }
  
  // Calculate progress: (sum of completion percentages) / total videos
  // This gives us the average completion across all videos
  const rawProgress = (totalCompletionPercentage / totalVideos);
  const courseProgressPercentage = Math.min(100, Math.round(rawProgress));
  
  // Count completed videos
  const completedVideos = progressEntries.filter(p => p.isCompleted).length;
  
  // Calculate total watched duration across all videos
  const totalWatchedDuration = progressEntries.reduce((sum, p) => sum + (p.watchedDuration || 0), 0);
  
  // Calculate course total duration (sum of all video durations from progress entries)
  const courseTotalDuration = progressEntries.reduce((sum, p) => sum + (p.totalDuration || 0), 0);
  
  // Find last watched video
  const lastWatched = progressEntries
    .filter(p => p.lastWatchedAt)
    .sort((a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt))[0];
  
  console.log(`📊 [getOverallCourseProgress] Course ${courseId}:`);
  console.log(`   - Total Videos (expected): ${totalVideos}`);
  console.log(`   - Progress Entries (videos with progress): ${progressEntries.length}`);
  console.log(`   - Completed Videos: ${completedVideos}`);
  console.log(`   - Total Completion % (sum of all video completions): ${totalCompletionPercentage}%`);
  console.log(`   - Raw Progress (${totalCompletionPercentage} / ${totalVideos}): ${rawProgress.toFixed(2)}%`);
  console.log(`   - Course Progress % (rounded & capped): ${courseProgressPercentage}%`);
  
  // Debug: Log each progress entry
  if (progressEntries.length > 0) {
    console.log(`   - Progress Entries Details:`);
    progressEntries.forEach((entry, idx) => {
      console.log(`     ${idx + 1}. Video ${entry.videoId}: ${entry.completionPercentage || 0}% complete, isCompleted: ${entry.isCompleted}`);
    });
  } else {
    console.log(`   - No progress entries found (all videos at 0%)`);
  }
  
  return {
    totalVideos: totalVideos,
    completedVideos,
    totalProgress: courseProgressPercentage,
    lastWatchedVideo: lastWatched ? lastWatched.videoId : null,
    lastWatchedPosition: lastWatched ? lastWatched.getLastPosition() : 0,
    courseProgressPercentage,
    totalWatchedDuration,
    courseTotalDuration
  };
};

// Static method to mark video as completed
progressSchema.statics.markVideoCompleted = function(userId, courseId, videoId) {
  console.log(`🔒 [Progress] Marking video as completed: ${videoId}`);
  return this.findOneAndUpdate(
    { userId, courseId, videoId },
    { 
      isCompleted: true,
      completionPercentage: 100,
      watchedPercentage: 100,
      completedAt: new Date(),
      lastWatchedAt: new Date()
    },
    { upsert: true, new: true }
  );
};

// Static method to reset video completion status (admin use only)
progressSchema.statics.resetVideoCompletion = function(userId, courseId, videoId) {
  console.log(`🔄 [Progress] Resetting video completion status: ${videoId}`);
  return this.findOneAndUpdate(
    { userId, courseId, videoId },
    { 
      isCompleted: false,
      completionPercentage: 0,
      watchedPercentage: 0,
      completedAt: null,
      lastWatchedAt: new Date()
    },
    { new: true }
  );
};

// Static method to get next video to watch
progressSchema.statics.getNextVideo = async function(userId, courseId, currentVideoId) {
  const Course = mongoose.model('Course');
  const course = await Course.findById(courseId).populate('videos');
  
  if (!course || !course.videos || course.videos.length === 0) {
    return null;
  }
  
  const sortedVideos = course.videos.sort((a, b) => (a.order || 0) - (b.order || 0));
  const currentIndex = sortedVideos.findIndex(v => v._id.toString() === currentVideoId);
  
  if (currentIndex === -1 || currentIndex === sortedVideos.length - 1) {
    return null; // No next video
  }
  
  return sortedVideos[currentIndex + 1];
};

// Static method to get course progress summary for dashboard
progressSchema.statics.getCourseProgressSummary = async function(userId, courseId, totalVideos = null) {
  // CRITICAL: totalVideos must be provided and must be the actual total number of videos in the course
  if (!totalVideos || totalVideos === 0) {
    console.warn(`⚠️ [getCourseProgressSummary] totalVideos not provided or is 0 for course ${courseId}`);
    return {
      totalVideos: 0,
      completedVideos: 0,
      courseProgressPercentage: 0,
      lastWatchedAt: null,
      totalWatchedDuration: 0,
      courseTotalDuration: 0
    };
  }
  
  const progressEntries = await this.find({ userId, courseId });
  
  // Calculate course progress: sum of all video completion percentages / total videos
  // Videos without progress entries count as 0%
  // Cap individual video completion at 100% to prevent exceeding maximum
  const totalCompletionPercentage = progressEntries.reduce((sum, p) => {
    const completion = Math.min(100, p.completionPercentage || 0);
    return sum + completion;
  }, 0);
  
  // IMPORTANT: Divide by actual total videos (including videos with no progress)
  // Ensure we don't divide by zero and cap at 100% to prevent exceeding maximum
  if (totalVideos === 0) {
    console.warn(`⚠️ [getCourseProgressSummary] totalVideos is 0, cannot calculate progress`);
    return {
      totalVideos: 0,
      completedVideos: 0,
      courseProgressPercentage: 0,
      lastWatchedAt: null,
      totalWatchedDuration: 0,
      courseTotalDuration: 0
    };
  }
  
  // Calculate progress: (sum of completion percentages) / total videos
  // This gives us the average completion across all videos
  const rawProgress = (totalCompletionPercentage / totalVideos);
  const courseProgressPercentage = Math.min(100, Math.round(rawProgress));
  
  // Count completed videos
  const completedVideos = progressEntries.filter(p => p.isCompleted).length;
  
  // Calculate total watched duration across all videos
  const totalWatchedDuration = progressEntries.reduce((sum, p) => sum + (p.watchedDuration || 0), 0);
  
  // Calculate course total duration (sum of all video durations from progress entries)
  const courseTotalDuration = progressEntries.reduce((sum, p) => sum + (p.totalDuration || 0), 0);
  
  const lastWatched = progressEntries
    .filter(p => p.lastWatchedAt)
    .sort((a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt))[0];
  
  console.log(`📊 [getCourseProgressSummary] Course ${courseId}:`);
  console.log(`   - Total Videos (expected): ${totalVideos}`);
  console.log(`   - Progress Entries (videos with progress): ${progressEntries.length}`);
  console.log(`   - Completed Videos: ${completedVideos}`);
  console.log(`   - Total Completion % (sum of all video completions): ${totalCompletionPercentage}%`);
  console.log(`   - Raw Progress (${totalCompletionPercentage} / ${totalVideos}): ${rawProgress.toFixed(2)}%`);
  console.log(`   - Course Progress % (rounded & capped): ${courseProgressPercentage}%`);
  
  // Debug: Log each progress entry
  if (progressEntries.length > 0) {
    console.log(`   - Progress Entries Details:`);
    progressEntries.forEach((entry, idx) => {
      console.log(`     ${idx + 1}. Video ${entry.videoId}: ${entry.completionPercentage || 0}% complete, isCompleted: ${entry.isCompleted}`);
    });
  } else {
    console.log(`   - No progress entries found (all videos at 0%)`);
  }
  
  return {
    totalVideos: totalVideos,
    completedVideos,
    courseProgressPercentage,
    lastWatchedAt: lastWatched ? lastWatched.lastWatchedAt : null,
    totalWatchedDuration,
    courseTotalDuration
  };
};

module.exports = mongoose.model('Progress', progressSchema); 