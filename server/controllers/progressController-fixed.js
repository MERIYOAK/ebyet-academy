const Progress = require('../models/Progress');
const Course = require('../models/Course');
const User = require('../models/User');

// Improved progress tracking with better UX
const pendingProgressUpdates = new Map();
const PROGRESS_UPDATE_INTERVAL = 5000; // Reduced from 30s to 5s for better responsiveness
const lastUpdateTimes = new Map();

// Monitoring and logging
const progressLogger = {
  log: (level, message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [PROGRESS-${level}] ${message}`, data);
  },
  error: (message, error) => {
    progressLogger.log('ERROR', message, { error: error.message, stack: error.stack });
  },
  warn: (message, data) => {
    progressLogger.log('WARN', message, data);
  },
  info: (message, data) => {
    progressLogger.log('INFO', message, data);
  }
};

/**
 * Validate progress data to prevent bugs
 */
function validateProgressData(watchedDuration, totalDuration) {
  const errors = [];
  
  // Fix 1: Validate watched duration
  if (watchedDuration < 0) {
    errors.push('Watched duration cannot be negative');
  }
  
  // Fix 2: Handle zero total duration
  if (totalDuration <= 0) {
    errors.push('Total duration must be greater than zero');
  }
  
  // Fix 3: Validate watched doesn't exceed total (with small tolerance)
  if (totalDuration > 0 && watchedDuration > totalDuration * 1.1) {
    errors.push('Watched duration cannot exceed total duration by more than 10%');
  }
  
  return errors;
}

/**
 * Calculate progress percentage with proper validation
 */
function calculateProgressPercentage(watchedDuration, totalDuration) {
  // Fix 4: Handle edge cases
  if (totalDuration <= 0) {
    return 0;
  }
  
  if (watchedDuration <= 0) {
    return 0;
  }
  
  // Fix 5: Cap at 100% and round properly
  const percentage = Math.min(100, Math.round((watchedDuration / totalDuration) * 100));
  return Math.max(0, percentage); // Ensure non-negative
}

/**
 * Determine completion status with consistent logic
 */
function determineCompletionStatus(watchedPercentage) {
  // Fix 6: Consistent completion logic
  const isCompleted = watchedPercentage >= 90;
  const completionPercentage = isCompleted ? 100 : watchedPercentage;
  
  return {
    isCompleted,
    completionPercentage
  };
}

/**
 * Update video progress with all bug fixes
 * POST /api/progress/update
 */
exports.updateProgress = async (req, res) => {
  try {
    const { courseId, videoId, watchedDuration, totalDuration, timestamp } = req.body;
    
    // Validate user authentication
    if (!req.user || (!req.user.userId && !req.user._id)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const userId = req.user.userId || req.user._id;
    const progressKey = `${userId}-${courseId}-${videoId}`;
    const now = Date.now();

    progressLogger.info('Progress update request', {
      userId,
      courseId,
      videoId,
      watchedDuration,
      totalDuration
    });

    // Validate required fields
    if (!courseId || !videoId || watchedDuration === undefined || totalDuration === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: courseId, videoId, watchedDuration, totalDuration'
      });
    }

    // Fix 7: Validate data before processing
    const validationErrors = validateProgressData(watchedDuration, totalDuration);
    if (validationErrors.length > 0) {
      progressLogger.warn('Invalid progress data', { errors: validationErrors, data: { watchedDuration, totalDuration } });
      return res.status(400).json({
        success: false,
        message: 'Invalid progress data',
        errors: validationErrors
      });
    }

    // Check if update is too frequent (reduced interval for better UX)
    const lastUpdate = lastUpdateTimes.get(progressKey);
    if (lastUpdate && (now - lastUpdate) < PROGRESS_UPDATE_INTERVAL) {
      progressLogger.info('Update skipped - too frequent', { 
        timeSinceLastUpdate: Math.round((now - lastUpdate) / 1000) 
      });
      return res.json({
        success: true,
        message: 'Update skipped - too frequent',
        data: { skipped: true }
      });
    }

    // Handle pending requests
    if (pendingProgressUpdates.has(progressKey)) {
      progressLogger.info('Cancelling previous request', { progressKey });
      const previousRequest = pendingProgressUpdates.get(progressKey);
      if (previousRequest && previousRequest.abort) {
        previousRequest.abort();
      }
    }

    const abortController = new AbortController();
    pendingProgressUpdates.set(progressKey, abortController);

    try {
      // Check if user has purchased the course or if video is free preview
      const user = await User.findById(userId);
      const hasPurchased = user && user.purchasedCourses && user.purchasedCourses.includes(courseId);
      
      if (!hasPurchased) {
        // Check if this is a free preview video
        const Video = require('../models/Video');
        const video = await Video.findById(videoId);
        
        if (!video || !video.isFreePreview) {
          return res.status(403).json({
            success: false,
            message: 'You must purchase this course to track progress'
          });
        }
      }

      // Fix 8: Use atomic operation for all updates to prevent race conditions
      const progressPercentage = calculateProgressPercentage(watchedDuration, totalDuration);
      const completionStatus = determineCompletionStatus(progressPercentage);
      
      // Atomic update with all fields
      const updatedProgress = await Progress.findOneAndUpdate(
        { userId, courseId, videoId },
        {
          $setOnInsert: {
            userId,
            courseId,
            videoId,
            totalDuration,
            firstWatchedAt: new Date()
          },
          $set: {
            totalDuration: totalDuration,
            lastWatchedAt: new Date(),
            watchedPercentage: progressPercentage,
            completionPercentage: completionStatus.completionPercentage,
            isCompleted: completionStatus.isCompleted,
            ...(completionStatus.isCompleted && { completedAt: new Date() })
          },
          $max: {
            watchedDuration: watchedDuration
          },
          $inc: {
            watchCount: 1
          },
          $push: {
            watchHistory: {
              $each: [{
                timestamp: Math.round(timestamp || watchedDuration),
                watchedAt: new Date()
              }],
              $slice: -10
            }
          }
        },
        { upsert: true, new: true, runValidators: true }
      );

      // Get course to calculate overall progress
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Fix 9: Improved course progress calculation
      const courseProgress = await calculateCourseProgress(userId, courseId, course.videos.length);

      // Check if course is completed and auto-generate certificate
      if (courseProgress.courseProgressPercentage >= 90) {
        try {
          const certificateController = require('./certificateController');
          await certificateController.autoGenerateCertificate(userId, courseId);
          progressLogger.info('Auto-generated certificate for completed course', { userId, courseId });
        } catch (certError) {
          progressLogger.error('Error auto-generating certificate', certError);
          // Don't fail the progress update if certificate generation fails
        }
      }

      // Update last update time
      lastUpdateTimes.set(progressKey, now);

      progressLogger.info('Video progress updated successfully', {
        watchedPercentage: progressPercentage,
        completionPercentage: completionStatus.completionPercentage,
        isCompleted: completionStatus.isCompleted,
        courseProgress: courseProgress.courseProgressPercentage
      });

      res.json({
        success: true,
        data: {
          videoProgress: {
            watchedDuration: updatedProgress.watchedDuration,
            totalDuration: updatedProgress.totalDuration,
            watchedPercentage: progressPercentage,
            completionPercentage: completionStatus.completionPercentage,
            isCompleted: completionStatus.isCompleted,
            lastPosition: updatedProgress.getLastPosition ? updatedProgress.getLastPosition() : watchedDuration
          },
          courseProgress: courseProgress
        }
      });

    } finally {
      // Clean up pending request
      pendingProgressUpdates.delete(progressKey);
    }

  } catch (error) {
    progressLogger.error('Progress update failed', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to update progress',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Fix 10: Improved course progress calculation
 */
async function calculateCourseProgress(userId, courseId, totalVideos) {
  try {
    // Get all progress entries for this course
    const progressEntries = await Progress.find({ userId, courseId });
    
    if (progressEntries.length === 0) {
      return {
        courseProgressPercentage: 0,
        completedVideos: 0,
        totalVideos: totalVideos,
        videosProgress: []
      };
    }

    // Count completed videos (more accurate than using completionPercentage)
    const completedVideos = progressEntries.filter(p => p.isCompleted).length;
    const courseProgressPercentage = Math.round((completedVideos / totalVideos) * 100);

    // Get individual video progress
    const videosProgress = progressEntries.map(entry => ({
      videoId: entry.videoId,
      watchedPercentage: entry.watchedPercentage,
      completionPercentage: entry.completionPercentage,
      isCompleted: entry.isCompleted,
      lastWatchedAt: entry.lastWatchedAt
    }));

    return {
      courseProgressPercentage,
      completedVideos,
      totalVideos,
      videosProgress
    };
  } catch (error) {
    progressLogger.error('Error calculating course progress', error);
    throw error;
  }
}

// Export the improved calculation function
exports.calculateCourseProgress = calculateCourseProgress;

// Keep existing functions but update them to use the new calculation
exports.getOverallCourseProgress = async (userId, courseId, totalVideos) => {
  return await calculateCourseProgress(userId, courseId, totalVideos);
};
