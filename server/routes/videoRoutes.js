const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const auth = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// ========================================
// ADMIN ROUTES (Require admin authentication)
// ========================================

/**
 * Generate presigned URL for direct S3 video upload
 * POST /api/videos/presigned-url
 * Body: { courseId, fileName, fileSize, mimeType, version }
 */
router.post('/presigned-url', auth, adminAuthMiddleware, async (req, res) => {
  try {
    const { courseId, fileName, fileSize, mimeType, version = 1 } = req.body;
    
    // Validate required fields
    if (!courseId || !fileName || !fileSize || !mimeType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: courseId, fileName, fileSize, mimeType'
      });
    }
    
    // Validate file type (video only)
    if (!mimeType.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        message: 'Only video files are allowed'
      });
    }
    
    // Validate file size (1GB max)
    if (fileSize > 1024 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum allowed size of 1GB'
      });
    }
    
    // Get course details for folder organization
    const Course = require('../models/Course');
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Generate S3 key using existing utility
    const { generateCourseFileKey } = require('../utils/s3CourseManager');
    const courseTitleString = typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || '');
    const s3Key = generateCourseFileKey('video', fileName, courseTitleString, version);
    
    // Generate presigned URL for upload
    const { getSignedUrlForFile } = require('../utils/s3CourseManager');
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const { createS3Client } = require('../utils/s3CourseManager');
    const s3Client = createS3Client();
    
    if (!s3Client) {
      return res.status(500).json({
        success: false,
        message: 'S3 not configured'
      });
    }
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      ContentType: mimeType,
      Metadata: {
        originalName: fileName,
        courseName: courseTitleString.replace(/[^a-zA-Z0-9\s-]/g, '_').replace(/\s+/g, '_'),
        version: version.toString(),
        fileType: 'video',
        uploadedAt: new Date().toISOString()
      }
    });
    
    // Generate presigned URL valid for 2 hours
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 7200 });
    
    console.log(`🔗 [presigned-url] Generated for course: ${courseId}, file: ${fileName}, key: ${s3Key}`);
    
    res.json({
      success: true,
      data: {
        uploadUrl,
        s3Key,
        expiresIn: 7200
      }
    });
    
  } catch (error) {
    console.error('❌ [presigned-url] Error generating presigned URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate upload URL',
      error: error.message
    });
  }
});

/**
 * Save video metadata after successful S3 upload
 * POST /api/videos/save-metadata
 * Body: { courseId, title, description, s3Key, order, duration, version, fileSize, mimeType, originalName, isFreePreview }
 */
router.post('/save-metadata', auth, adminAuthMiddleware, async (req, res) => {
  try {
    const { 
      courseId, 
      title, 
      description, 
      s3Key, 
      order, 
      duration, 
      version = 1, 
      fileSize, 
      mimeType, 
      originalName, 
      isFreePreview = false 
    } = req.body;
    
    // Validate required fields
    if (!courseId || !title || !s3Key || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: courseId, title, s3Key, duration'
      });
    }
    
    // Parse bilingual title and description if they come as JSON strings
    let parsedTitle = title;
    let parsedDescription = description;
    
    console.log('[save-metadata] Raw title type:', typeof title, 'value:', title);
    console.log('[save-metadata] Raw description type:', typeof description, 'value:', description);
    
    try {
      if (typeof title === 'string' && title.startsWith('{')) {
        parsedTitle = JSON.parse(title);
      }
      if (typeof description === 'string' && description.startsWith('{')) {
        parsedDescription = JSON.parse(description);
      }
    } catch (e) {
      console.log('[save-metadata] Title/description not JSON, using as string');
      // Keep the original values if JSON parsing fails
      if (typeof title === 'string') {
        parsedTitle = title;
      }
      if (typeof description === 'string') {
        parsedDescription = description;
      }
    }
    
    console.log('[save-metadata] Parsed title:', parsedTitle);
    console.log('[save-metadata] Parsed description:', parsedDescription);
    
    const adminEmail = req.admin?.email || req.user?.email || 'admin';
    
    console.log('[save-metadata] courseId:', courseId, 'title:', parsedTitle, 's3Key:', s3Key, 'version:', version);
    
    // Get course and version info
    const Course = require('../models/Course');
    const Video = require('../models/Video');
    
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Parse duration from MM:SS or HH:MM:SS format to seconds
    const parseDurationToSeconds = (durationStr) => {
      if (!durationStr || typeof durationStr !== 'string') {
        return 0;
      }
      
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
    
    let detectedDuration = 0;
    try {
      detectedDuration = parseDurationToSeconds(duration);
      console.log(`✅ [save-metadata] Duration parsed: ${duration} = ${detectedDuration} seconds`);
    } catch (error) {
      console.error(`❌ [save-metadata] Duration parsing failed:`, error);
      return res.status(400).json({
        success: false,
        message: `Invalid duration format: ${duration}. Please use MM:SS or HH:MM:SS format.`
      });
    }
    
    // Create video record without versioning
    const video = await Video.create({ 
      title: parsedTitle, 
      description: parsedDescription || '',
      s3Key, 
      courseId, 
      duration: detectedDuration,
      order: order ? parseInt(order) : 0,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'video/mp4',
      originalName: originalName || 'video.mp4',
      uploadedBy: adminEmail,
      isFreePreview: isFreePreview === 'true' || isFreePreview === true,
      status: 'active'
    });
    
    console.log('[save-metadata] created video:', video._id, 'with duration:', video.duration, 'seconds');
    
    // Add video directly to course
    course.videos.push(video._id);
    course.lastModifiedBy = adminEmail;
    await course.save();
    
    res.status(201).json({
      success: true,
      message: `Video metadata saved successfully${isFreePreview ? ' as free preview' : ''}`,
      data: {
        video: {
          id: video._id,
          title: video.title,
          description: video.description,
          s3Key: video.s3Key,
          order: video.order,
          courseVersion: video.courseVersion,
          duration: video.duration,
          formattedDuration: video.formattedDuration,
          isFreePreview: video.isFreePreview
        }
      }
    });
          // Emit real-time update to connected users
        try {
          const socketService = req.app.get('socketService');
          if (socketService) {
            // Get course information for the broadcast
            const Course = require('../models/Course');
            const course = await Course.findById(courseId);
            const courseTitle = course ? (typeof course.title === 'string' ? course.title : course.title?.en || 'Course') : 'Course';
              
            console.log('📢 [save-metadata] Emitting NEW_VIDEO event to connected users');
            socketService.broadcastContentUpdate('NEW_VIDEO', {
              video: video,
              courseId: courseId,
              courseTitle: courseTitle,
              message: `New video "${video.title}" added to course`
            });
          }
        } catch (socketError) {
          console.warn('⚠️ [save-metadata] Failed to emit Socket.IO update:', socketError);
        }
  } catch (error) {
    console.error('[save-metadata] error:', error?.message || error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to save video metadata', 
      error: error.message 
    });
  }
});

/**
 * Update video (preserve old video in S3) - LEGACY - kept for backward compatibility
 * PUT /api/videos/:videoId
 * Body: { title, duration, order, file? }
 */
router.put('/:videoId', auth, adminAuthMiddleware, videoController.updateVideo);

/**
 * Delete video (permanent deletion from database and S3)
 * DELETE /api/videos/:videoId
 */
router.delete('/:videoId', auth, adminAuthMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';
    
    console.log(`🗑️ [deleteVideo] Starting deletion of video: ${videoId} by ${adminEmail}`);
    
    const Video = require('../models/Video');
    const Course = require('../models/Course');
    const { deleteFileFromS3 } = require('../utils/s3CourseManager');
    
    // Find video
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    console.log(`📹 [deleteVideo] Found video: ${video.title}`);
    console.log(`   - S3 Key: ${video.s3Key}`);
    console.log(`   - Course ID: ${video.courseId}`);
    
    // Delete from S3
    if (video.s3Key) {
      try {
        await deleteFileFromS3(video.s3Key);
        console.log(`✅ [deleteVideo] Deleted from S3: ${video.s3Key}`);
      } catch (s3Error) {
        console.error(`❌ [deleteVideo] Failed to delete from S3:`, s3Error);
        // Continue with database deletion even if S3 deletion fails
      }
    }
    
    // Remove video from course
    const course = await Course.findById(video.courseId);
    if (course) {
      course.videos = course.videos.filter(vid => vid.toString() !== videoId);
      course.lastModifiedBy = adminEmail;
      await course.save();
      console.log(`✅ [deleteVideo] Removed video from course: ${course.title}`);
    }
    
    // Delete from database
    await Video.findByIdAndDelete(videoId);
    console.log(`✅ [deleteVideo] Deleted from database: ${video.title}`);
    
    res.json({
      success: true,
      message: 'Video deleted successfully',
      data: {
        videoId: video._id,
        title: video.title
      }
    });
    
    console.log(`✅ [deleteVideo] Video deletion completed: ${video.title} by ${adminEmail}`);
    
    // Emit real-time update to connected users
    try {
      const socketService = req.app.get('socketService');
      if (socketService) {
        const courseTitle = course ? (typeof course.title === 'string' ? course.title : course.title?.en || 'Course') : 'Course';
        
        console.log('📢 [deleteVideo] Emitting VIDEO_DELETED event to connected users');
        socketService.broadcastContentUpdate('VIDEO_DELETED', {
          videoId: video._id,
          video: video,
          courseId: video.courseId,
          courseTitle: courseTitle,
          message: `Video "${video.title}" deleted from course`
        });
      }
    } catch (socketError) {
      console.warn('⚠️ [deleteVideo] Failed to emit Socket.IO update:', socketError);
    }
    
  } catch (error) {
    console.error('❌ [deleteVideo] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video',
      error: error.message
    });
  }
});

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