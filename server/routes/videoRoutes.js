const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const auth = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = '/tmp/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for video uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, '/tmp/uploads'); // Use temporary directory
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 1000 * 1024 * 1024, // 1GB limit for large videos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 500MB.'
      });
    }
  }
  if (error.message.includes('Only video files')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next(error);
};

// Apply error handling middleware
router.use(handleMulterError);

// ========================================
// ADMIN ROUTES (Require admin authentication)
// ========================================

/**
 * Upload video for a course version
 * POST /api/videos/upload
 * Body: { courseId, version, title, order, file }
 */
router.post('/upload', auth, adminAuthMiddleware, upload.single('file'), videoController.uploadVideo);

/**
 * Update video (preserve old video in S3)
 * PUT /api/videos/:videoId
 * Body: { title, duration, order, file? }
 */
router.put('/:videoId', auth, adminAuthMiddleware, upload.single('file'), videoController.updateVideo);

/**
 * Archive video (soft delete)
 * DELETE /api/videos/:videoId
 */
router.delete('/:videoId', auth, adminAuthMiddleware, videoController.deleteVideo);

/**
 * Restore archived video
 * POST /api/videos/:videoId/restore
 */
router.post('/:videoId/restore', auth, adminAuthMiddleware, videoController.restoreVideo);

/**
 * Toggle free preview status for a video (admin only)
 * PUT /api/videos/:videoId/free-preview
 * Body: { isFreePreview: boolean }
 */
router.put('/:videoId/free-preview', auth, adminAuthMiddleware, videoController.toggleFreePreview);

/**
 * Get video by ID with signed URL
 * GET /api/videos/:videoId
 */
router.get('/:videoId', auth, videoController.getVideoById);

/**
 * Get videos for a specific course version
 * GET /api/videos/course/:courseId/version/:version
 * Optional authentication - public users get free previews, authenticated users get full access if purchased
 */
router.get('/course/:courseId/version/:version', optionalAuth, videoController.getVideosByCourseVersion);

/**
 * Get video statistics for a course
 * GET /api/videos/statistics/:courseId
 */
router.get('/statistics/:courseId', auth, adminAuthMiddleware, videoController.getVideoStatistics);

// ========================================
// USER ROUTES (Require user authentication)
// ========================================

/**
 * Stream video (for enrolled students)
 * GET /api/videos/:videoId/stream
 */
router.get('/:videoId/stream', auth, videoController.streamVideo);

// ========================================
// ADMIN-ONLY VIDEO MANAGEMENT ROUTES
// ========================================

/**
 * Get all videos by status (admin only)
 * GET /api/videos/admin/status/:status
 */
router.get('/admin/status/:status', auth, adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.params;
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const Video = require('../models/Video');
    const videos = await Video.find({ status })
      .populate('courseId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Video.countDocuments({ status });

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('❌ Get videos by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos',
      error: error.message
    });
  }
});

/**
 * Get processing videos (admin only)
 * GET /api/videos/admin/processing
 */
router.get('/admin/processing', auth, adminAuthMiddleware, async (req, res) => {
  try {
    const Video = require('../models/Video');
    const videos = await Video.find({ 
      processingStatus: { $in: ['pending', 'processing'] } 
    }).populate('courseId', 'title');

    res.json({
      success: true,
      data: {
        videos,
        count: videos.length
      }
    });
  } catch (error) {
    console.error('❌ Get processing videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch processing videos',
      error: error.message
    });
  }
});

/**
 * Bulk delete videos (admin only) - permanently deletes from database and S3
 * POST /api/videos/admin/bulk-delete
 * Body: { videoIds: [] }
 */
router.post('/admin/bulk-delete', auth, adminAuthMiddleware, async (req, res) => {
  try {
    const { videoIds } = req.body;
    const adminEmail = req.admin?.email || 'admin';

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Video IDs array is required'
      });
    }

    const Video = require('../models/Video');
    const CourseVersion = require('../models/CourseVersion');
    const Course = require('../models/Course');
    const { deleteFileFromS3 } = require('../utils/s3CourseManager');
    const results = [];

    for (const videoId of videoIds) {
      try {
        const video = await Video.findById(videoId);
        if (video) {
          console.log(`🗑️ [bulk-delete] Deleting video: ${video.title} (${video._id})`);
          
          // Delete from S3
          if (video.s3Key) {
            try {
              await deleteFileFromS3(video.s3Key);
              console.log(`✅ [bulk-delete] Deleted from S3: ${video.s3Key}`);
            } catch (s3Error) {
              console.error(`❌ [bulk-delete] Failed to delete from S3:`, s3Error);
              // Continue with database deletion
            }
          }
          
          // Remove from course version
          const courseVersion = await CourseVersion.findOne({ 
            courseId: video.courseId, 
            versionNumber: video.courseVersion 
          });
          
          if (courseVersion) {
            courseVersion.videos = courseVersion.videos.filter(vid => vid.toString() !== video._id.toString());
            await courseVersion.save();
            await courseVersion.updateStatistics();
          }
          
          // Remove from main course if it's the current version
          const course = await Course.findById(video.courseId);
          if (course && course.currentVersion === video.courseVersion) {
            course.videos = course.videos.filter(vid => vid.toString() !== video._id.toString());
            await course.save();
          }
          
          // Delete from database
          await Video.findByIdAndDelete(video._id);
          
          results.push({
            videoId,
            success: true,
            title: video.title,
            s3Key: video.s3Key
          });
        } else {
          results.push({
            videoId,
            success: false,
            error: 'Video not found'
          });
        }
      } catch (error) {
        results.push({
          videoId,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Bulk delete videos completed: ${successful} successful, ${failed} failed by ${adminEmail}`);

    res.json({
      success: true,
      message: `Bulk delete completed: ${successful} successful, ${failed} failed`,
      data: {
        results,
        summary: {
          total: videoIds.length,
          successful,
          failed
        }
      }
    });

  } catch (error) {
    console.error('❌ Bulk delete videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete videos',
      error: error.message
    });
  }
});


// Test endpoint to set video durations
router.post('/test-durations', async (req, res) => {
  try {
    const Video = require('../models/Video');
    const videos = await Video.find({});
    
    if (videos.length === 0) {
      return res.json({
        success: true,
        message: 'No videos found in database'
      });
    }
    
    // Test durations in seconds
    const testDurations = [
      330,   // 5:30 (5 * 60 + 30)
      765,   // 12:45 (12 * 60 + 45)
      495,   // 8:15 (8 * 60 + 15)
      920,   // 15:20 (15 * 60 + 20)
      225,   // 3:45 (3 * 60 + 45)
      1330,  // 22:10 (22 * 60 + 10)
      450,   // 7:30 (7 * 60 + 30)
      1135,  // 18:55 (18 * 60 + 55)
      260,   // 4:20 (4 * 60 + 20)
      1515   // 25:15 (25 * 60 + 15)
    ];
    
    let updatedCount = 0;
    
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const testDuration = testDurations[i % testDurations.length];
      
      video.duration = testDuration; // Store as seconds
      await video.save();
      updatedCount++;
    }
    
    res.json({
      success: true,
      message: `Updated ${updatedCount} videos with test durations (in seconds)`,
      updatedCount
    });
    
  } catch (error) {
    console.error('Test durations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set test durations',
      error: error.message
    });
  }
});

/**
 * Update video duration (admin only)
 * PUT /api/videos/:videoId/duration
 * Body: { duration: "MM:SS" or "HH:MM:SS" }
 */
router.put('/:videoId/duration', auth, adminAuthMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { duration } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    if (!duration) {
      return res.status(400).json({
        success: false,
        message: 'Duration is required'
      });
    }

    const Video = require('../models/Video');
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Parse duration to seconds
    const parseDurationToSeconds = (durationStr) => {
      const parts = durationStr.trim().split(':');
      
      if (parts.length === 2) {
        // MM:SS format
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        return (minutes * 60) + seconds;
      } else if (parts.length === 3) {
        // HH:MM:SS format
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2], 10);
        return (hours * 3600) + (minutes * 60) + seconds;
      } else {
        throw new Error(`Invalid duration format: ${durationStr}. Use MM:SS or HH:MM:SS`);
      }
    };

    const durationInSeconds = parseDurationToSeconds(duration);
    
    // Format duration for display
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      } else {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      }
    };

    // Update video duration
    video.duration = durationInSeconds;
    video.formattedDuration = formatDuration(durationInSeconds);
    await video.save();

    console.log(`✅ [Admin] Video duration updated: ${video.title} = ${durationInSeconds}s (${formatDuration(durationInSeconds)}) by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Video duration updated successfully',
      data: {
        video: {
          id: video._id,
          title: video.title,
          duration: video.duration,
          formattedDuration: video.formattedDuration
        }
      }
    });

  } catch (error) {
    console.error('❌ Update video duration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video duration',
      error: error.message
    });
  }
});

module.exports = router; 