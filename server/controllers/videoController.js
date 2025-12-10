const Video = require('../models/Video');
const Course = require('../models/Course');
const CourseVersion = require('../models/CourseVersion');
const { getVideosWithAccess, checkVideoAccess } = require('../utils/purchaseUtils');
const { 
  uploadCourseFile, 
  getSignedUrlForFile, 
  deleteFileFromS3, 
  validateFile,
  getCourseFolderPath
} = require('../utils/s3CourseManager');

// Also import the old S3 utility as backup
const { uploadToS3 } = require('../utils/s3');
const { 
  getVideoDuration, 
  getVideoMetadata, 
  formatDuration, 
  isValidVideoFormat 
} = require('../utils/videoDurationDetector');

/**
 * Parse duration string to seconds
 * Supports formats: MM:SS or HH:MM:SS
 * @param {string} durationStr - Duration string (e.g., "5:30" or "1:25:45")
 * @returns {number} Duration in seconds
 */
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

/**
 * Upload video for a course version
 */
exports.uploadVideo = async (req, res) => {
  try {
    const { title, courseId, description, order, version = 1, duration } = req.body;
    const isFreePreview = req.body.isFreePreview === 'true' || req.body.isFreePreview === true;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';
    
    console.log('[uploadVideo] courseId:', req.body?.courseId, 'title:', req.body?.title, 'size:', req.file?.size, 'file:', req.file?.originalname, 'isFreePreview:', isFreePreview);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    if (!courseId) {
      return res.status(400).json({ 
        success: false,
        message: 'Course ID is required' 
      });
    }

    // Validate video format
    if (!isValidVideoFormat(req.file)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video format. Supported formats: MP4, WebM, OGG, AVI, MOV, WMV, FLV, MKV'
      });
    }
    
    // Get course details for folder organization
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }

    // Get course version
    const courseVersion = await CourseVersion.findOne({ 
      courseId, 
      versionNumber: parseInt(version) 
    });

    if (!courseVersion) {
      return res.status(404).json({ 
        success: false,
        message: 'Course version not found' 
      });
    }
    
    // Validate file size
    validateFile(req.file, ['video/mp4', 'video/webm', 'video/ogg'], 500 * 1024 * 1024); // 500MB max
    
    console.log('🎬 [uploadVideo] Processing duration from form input...');
    
    // Parse duration from form input (MM:SS or HH:MM:SS format)
    let detectedDuration = 0;
    let videoMetadata = null;
    
    if (duration) {
      try {
        detectedDuration = parseDurationToSeconds(duration);
        console.log(`✅ [uploadVideo] Duration parsed: ${duration} = ${detectedDuration} seconds`);
      } catch (error) {
        console.error(`❌ [uploadVideo] Duration parsing failed:`, error);
        detectedDuration = 0;
      }
    } else {
      console.log(`⚠️ [uploadVideo] No duration provided, using default: 0:00`);
    }
    
    // Upload with organized structure (with timeout protection)
    console.log('📤 [uploadVideo] Starting S3 upload...');
    console.log('📁 [uploadVideo] File details:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      buffer: req.file.buffer ? 'exists' : 'null'
    });
    
    // Use AWS SDK v2 directly since v3 is hanging
    console.log('🔧 [uploadVideo] Using AWS SDK v2 for reliable upload...');
    const s3Key = `persi-academy/courses/${course.title.replace(/[^a-zA-Z0-9\s-]/g, '_').replace(/\s+/g, '_')}/v${version}/videos/${Date.now()}_${req.file.originalname}`;
    // S3 Key generated
    
    console.log('🔧 [uploadVideo] About to call uploadToS3...');
    const uploadStartTime = Date.now();
    
    const s3UploadResult = await Promise.race([
      uploadToS3(req.file, s3Key, 'private').then((result) => {
        const uploadTime = Date.now() - uploadStartTime;
        console.log('🔧 [uploadVideo] uploadToS3 completed in', uploadTime, 'ms');
        return result;
      }),
      new Promise((_, reject) => 
        setTimeout(() => {
          const uploadTime = Date.now() - uploadStartTime;
          console.log('🔧 [uploadVideo] uploadToS3 timeout after', uploadTime, 'ms');
          reject(new Error('AWS SDK v2 upload timeout after 30 minutes'));
        }, 30 * 60 * 1000) // 30 minutes for large files
      )
    ]);
    
    uploadResult = {
      success: true,
      s3Key,
      url: s3UploadResult.Location,
      etag: s3UploadResult.ETag
    };
    // AWS SDK v2 upload completed

    // Clean up temporary file immediately after successful upload
    if (req.file.path) {
      try {
        require('fs').unlinkSync(req.file.path);
        console.log('🧹 [uploadVideo] Temporary file cleaned up:', req.file.path);
      } catch (err) {
        console.error('❌ [uploadVideo] Error deleting temp video file:', err);
      }
    }
    
    // Use detected duration or fallback to 0
    const processedDuration = detectedDuration || 0; // Store as seconds
    console.log('[uploadVideo] final processed duration:', processedDuration, 'seconds');
    
    const video = await Video.create({ 
      title, 
      description: description || '',
      s3Key: uploadResult.s3Key, 
      courseId, 
      courseVersion: parseInt(version),
      duration: processedDuration, // Store as seconds
      order: order ? parseInt(order) : 0,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      uploadedBy: adminEmail,
      isFreePreview: isFreePreview, // Add isFreePreview field
      // Store additional metadata if available
      ...(videoMetadata && {
        width: videoMetadata.width,
        height: videoMetadata.height,
        fps: videoMetadata.fps,
        videoCodec: videoMetadata.videoCodec,
        audioCodec: videoMetadata.audioCodec,
        bitrate: videoMetadata.bitrate
      })
    });
    console.log('[uploadVideo] created video:', video._id, 'with duration:', video.duration, 'seconds');
    
    // Add video to course version
    courseVersion.videos.push(video._id);
    await courseVersion.save();
    
    // Add video to main course if this is the current version
    if (course.currentVersion === parseInt(version)) {
      course.videos.push(video._id);
      course.lastModifiedBy = adminEmail;
      await course.save();
    }

    // Update version statistics
    await courseVersion.updateStatistics();
    
    // Optionally queue for background duration detection if no duration was provided
    if (!duration && process.env.ENABLE_BACKGROUND_DURATION_DETECTION === 'true') {
      try {
        const backgroundProcessor = require('../utils/backgroundDurationProcessor');
        backgroundProcessor.queueVideoForProcessing(video._id);
        console.log(`📋 [uploadVideo] Queued video ${video._id} for background duration detection`);
      } catch (error) {
        console.error(`❌ [uploadVideo] Failed to queue for background processing:`, error);
      }
    }
    
    res.status(201).json({
      success: true,
      message: `Video uploaded successfully${isFreePreview ? ' as free preview' : ''}`,
      data: {
        video: {
          id: video._id,
          title: video.title,
          description: video.description,
          s3Key: video.s3Key,
          order: video.order,
          courseVersion: video.courseVersion,
          duration: video.duration, // Raw duration in seconds
          formattedDuration: video.formattedDuration, // Formatted duration (MM:SS or HH:MM:SS)
          isFreePreview: video.isFreePreview,
          metadata: videoMetadata ? {
            resolution: `${videoMetadata.width}x${videoMetadata.height}`,
            fps: videoMetadata.fps,
            codec: `${videoMetadata.videoCodec}/${videoMetadata.audioCodec}`,
            fileSize: `${(videoMetadata.fileSize / (1024 * 1024)).toFixed(2)} MB`
          } : null
        }
      }
    });
  } catch (err) {
    console.error('[uploadVideo] error:', err?.message || err);
    
    // Clean up temporary file if it exists
    if (req.file && req.file.path) {
      try {
        require('fs').unlinkSync(req.file.path);
        console.log('🧹 [uploadVideo] Temporary file cleaned up on error:', req.file.path);
      } catch (error) {
        console.error('❌ [uploadVideo] Error deleting temp video file:', error);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Upload failed', 
      error: err.message 
    });
  }
};

/**
 * Update video (preserve old video in S3)
 */
exports.updateVideo = async (req, res) => {
  try {
    console.log('[updateVideo] videoId:', req.params.videoId, 'file:', req.file?.originalname);
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    
    // Store old video info for potential future use
    const oldVideoInfo = {
      s3Key: video.s3Key,
      title: video.title,
      duration: video.duration,
      order: video.order
    };
    
    // If a new file is uploaded, upload to S3 (preserve old)
    let s3Key = video.s3Key;
    if (req.file) {
      // Preserving old video in S3
      
      // Get course details for folder organization
      const course = await Course.findById(video.courseId);
      if (!course) return res.status(404).json({ message: 'Course not found' });
      
      // Upload new video with organized structure
      const uploadResult = await uploadCourseFile(req.file, 'video', course.title, video.courseVersion);
      
      s3Key = uploadResult.s3Key;
      // New S3 key generated
    }
    
    // Update video fields
    video.title = req.body.title || video.title;
    video.description = req.body.description || video.description;
    video.order = req.body.order || video.order;
    video.s3Key = s3Key;
    
    // If a new file is uploaded, detect duration automatically
    if (req.file) {
      try {
        console.log('🎬 [updateVideo] Detecting duration for new video file...');
        const videoMetadata = await getVideoMetadata(req.file);
        video.duration = videoMetadata.duration; // Store as seconds
        console.log(`✅ [updateVideo] New duration detected: ${videoMetadata.duration} seconds`);
        
        // Update additional metadata
        video.width = videoMetadata.width;
        video.height = videoMetadata.height;
        video.fps = videoMetadata.fps;
        video.videoCodec = videoMetadata.videoCodec;
        video.audioCodec = videoMetadata.audioCodec;
        video.bitrate = videoMetadata.bitrate;
      } catch (durationError) {
        console.error(`❌ [updateVideo] Duration detection failed:`, durationError);
        // Keep existing duration if detection fails
      }
      
      video.fileSize = req.file.size;
      video.mimeType = req.file.mimetype;
      video.originalName = req.file.originalname;
    }
    
    await video.save();
    
    res.json({
      success: true,
      message: 'Video updated successfully',
      data: {
        video,
        oldVideoInfo // Return old video info for potential restoration
      }
    });
  } catch (err) {
    console.error('[updateVideo] error:', err?.message || err);
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

/**
 * Delete video (permanent deletion from database and S3)
 */
exports.deleteVideo = async (req, res) => {
  try {
    console.log('[deleteVideo] videoId:', req.params.videoId);
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    
    console.log(`🗑️ [deleteVideo] Starting deletion of video: ${video.title}`);
    console.log(`   - S3 Key: ${video.s3Key}`);
    console.log(`   - Course ID: ${video.courseId}`);
    
    // Delete the video file from S3
    if (video.s3Key) {
      try {
        console.log(`🔧 [deleteVideo] Deleting video from S3: ${video.s3Key}`);
        await deleteFileFromS3(video.s3Key);
        console.log(`✅ [deleteVideo] Successfully deleted video from S3`);
      } catch (s3Error) {
        console.error(`❌ [deleteVideo] Failed to delete video from S3:`, s3Error);
        // Continue with database deletion even if S3 deletion fails
        // This prevents orphaned database records
      }
    } else {
      console.log(`⚠️ [deleteVideo] No S3 key found for video, skipping S3 deletion`);
    }
    
    // Delete the video from database (permanent deletion)
    await Video.findByIdAndDelete(video._id);
    console.log(`✅ [deleteVideo] Successfully deleted video from database`);
    
    // Remove from course version
    const courseVersion = await CourseVersion.findOne({ 
      courseId: video.courseId, 
      versionNumber: video.courseVersion 
    });
    
    if (courseVersion) {
      courseVersion.videos = courseVersion.videos.filter(vid => vid.toString() !== video._id.toString());
      await courseVersion.save();
      await courseVersion.updateStatistics();
      console.log(`✅ [deleteVideo] Removed video from CourseVersion`);
    }
    
    // Remove from main course if it's the current version
    const course = await Course.findById(video.courseId);
    if (course && course.currentVersion === video.courseVersion) {
      course.videos = course.videos.filter(vid => vid.toString() !== video._id.toString());
      await course.save();
      console.log(`✅ [deleteVideo] Removed video from Course`);
    }
    
    // Log the successful deletion for debugging
    console.log(`✅ [deleteVideo] Video permanently deleted: ${video.title} (${video._id})`);
    console.log(`   Course: ${course?.title} (${video.courseId})`);
    console.log(`   Removed from CourseVersion: ${courseVersion ? 'Yes' : 'No'}`);
    console.log(`   Removed from Course: ${course ? 'Yes' : 'No'}`);
    console.log(`   Deleted from S3: ${video.s3Key ? 'Yes' : 'No'}`);
    
    res.json({ 
      success: true,
      message: 'Video permanently deleted successfully',
      data: {
        videoId: video._id,
        deletedAt: new Date().toISOString(),
        courseId: video.courseId,
        courseTitle: course?.title,
        s3Key: video.s3Key
      }
    });
  } catch (err) {
    console.error('[deleteVideo] error:', err?.message || err);
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};

/**
 * Get video by ID with signed URL
 */
exports.getVideoById = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const isAdmin = req.user?.role === 'admin';
    
    console.log('[getVideoById] videoId:', videoId, 'type:', typeof videoId);
    
    // Validate videoId parameter
    if (!videoId || typeof videoId !== 'string' || videoId === '[object Object]') {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID provided'
      });
    }
    
    // Check if videoId is a valid MongoDB ObjectId
    if (!videoId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID format'
      });
    }
    
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check video access
    const accessInfo = await checkVideoAccess(videoId, userId, isAdmin);
    
    if (!accessInfo.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this video',
        data: {
          isLocked: true,
          lockReason: accessInfo.lockReason,
          requiresPurchase: accessInfo.lockReason === 'purchase_required'
        }
      });
    }

    // Get course details
    const course = await Course.findById(video.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get video URL for streaming using signed URLs with enhanced security
    let videoUrl = null;
    try {
      if (video.s3Key) {
        // Generating presigned URL for S3 key
        console.log('🔗 [SERVER] Video MIME type:', video.mimeType || 'not set');
        
        // Use shorter expiration time for enhanced security
        const expirationTime = 1800; // 30 minutes instead of 1 hour
        
        videoUrl = await getSignedUrlForFile(video.s3Key, expirationTime, video.mimeType);
        
        if (videoUrl) {
          // Secure presigned URL generated successfully
        } else {
          // Failed to generate presigned URL
        }
      } else {
        console.log('⚠️  [SERVER] No S3 key found for video:', video._id);
      }
    } catch (error) {
      console.error('💥 [SERVER] Error generating signed video URL:', error);
      videoUrl = null;
    }

    res.json({
      success: true,
      data: {
        video: {
          id: video._id,
          title: video.title,
          description: video.description,
          s3Key: video.s3Key,
          duration: video.duration, // Raw duration in seconds
          formattedDuration: video.formattedDuration, // Formatted duration (MM:SS or HH:MM:SS)
          order: video.order,
          courseId: video.courseId,
          courseVersion: video.courseVersion,
          courseTitle: course.title,
          videoUrl: videoUrl,
          uploadedBy: video.uploadedBy,
          createdAt: video.createdAt,
          status: video.status
        }
      }
    });
  } catch (error) {
    console.error('❌ Get video by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video',
      error: error.message
    });
  }
};

/**
 * Get videos for a specific course version
 */
exports.getVideosByCourseVersion = async (req, res) => {
  try {
    const { courseId, version } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const isAdmin = req.user?.role === 'admin';
    const isPublicUser = !req.user; // No user means public access
    
    console.log(`🔧 [getVideosByCourseVersion] Request details:`, {
      courseId,
      version,
      userId: userId || 'public',
      isAdmin,
      isPublicUser,
      hasUser: !!req.user,
      userRole: req.user?.role
    });
    
    console.log(`🔧 [getVideosByCourseVersion] courseId: ${courseId}, version: ${version}, userId: ${userId || 'public'}, isAdmin: ${isAdmin}`);
    
    // Get all videos for the course version using the static method
    const videos = await Video.getByCourseVersion(courseId, parseInt(version));

    console.log(`📊 Found ${videos.length} videos for course ${courseId}, version ${version}`);
    
    if (!videos || videos.length === 0) {
      console.log('⚠️ No videos found for this course version');
      return res.json({
        success: true,
        data: {
          videos: [],
          count: 0,
          userHasPurchased: false,
          hasFreePreviews: false
        }
      });
    }

    // Check if there are any free preview videos
    const hasFreePreviews = videos.some(video => video.isFreePreview);
    console.log(`📊 Free preview videos: ${videos.filter(v => v.isFreePreview).length}/${videos.length}`);
    
    // Log video details for debugging
    videos.forEach((video, index) => {
      console.log(`   Video ${index + 1}: ${video.title} (Free Preview: ${video.isFreePreview})`);
    });
    
    // For public users, we need to handle access control differently
    let videosWithAccess;
    let userHasPurchased = false;

    if (isPublicUser) {
      // Public user logic
      if (hasFreePreviews) {
        // If course has free previews, show all videos but mark non-free ones as locked
        videosWithAccess = await Promise.all(videos.map(async (video) => {
          const videoObj = video.toObject();
          const isFreePreview = video.isFreePreview;
          
          // Get presigned URL for free preview videos
          let presignedUrl = null;
          if (isFreePreview) {
            try {
              // Generating presigned URL for free preview
              console.log(`🔧 [getVideosByCourseVersion] Video MIME type: ${video.mimeType || 'not set'}`);
              presignedUrl = await getSignedUrlForFile(video.s3Key, 3600, video.mimeType);
            } catch (error) {
              console.error(`❌ Error getting presigned URL for video ${video._id}:`, error);
            }
          }
          
          return {
            ...videoObj,
            hasAccess: isFreePreview,
            isLocked: !isFreePreview,
            lockReason: isFreePreview ? null : 'purchase_required',
            videoUrl: presignedUrl, // Use videoUrl for consistency
            presignedUrl: presignedUrl // Keep both for backward compatibility
          };
        }));
      } else {
        // If no free previews, show all videos as locked
        videosWithAccess = videos.map(video => ({
          ...video.toObject(),
          hasAccess: false,
          isLocked: true,
          lockReason: 'purchase_required',
          presignedUrl: null
        }));
      }
      userHasPurchased = false;
    } else {
      // Authenticated user - use existing access control logic
      videosWithAccess = await getVideosWithAccess(
        courseId, 
        userId, 
        isAdmin, 
        parseInt(version)
      );
      userHasPurchased = isAdmin || await require('../utils/purchaseUtils').userHasPurchased(userId, courseId);
      
      console.log(`🔧 [getVideosByCourseVersion] Purchase verification:`, {
        userId,
        courseId,
        isAdmin,
        userHasPurchased,
        userRole: req.user?.role,
        userEmail: req.user?.email
      });
      
      // Debug: Check user's purchased courses directly
      if (userId) {
        const user = await require('../models/User').findById(userId);
        console.log(`🔧 [getVideosByCourseVersion] User purchased courses:`, {
          userId,
          purchasedCourses: user?.purchasedCourses || [],
          purchasedCoursesLength: user?.purchasedCourses?.length || 0,
          courseIdInPurchased: user?.purchasedCourses?.includes(courseId) || false
        });
      }
      
      // Generate presigned URLs for videos that the user has access to
      videosWithAccess = await Promise.all(videosWithAccess.map(async (video) => {
        const videoObj = { ...video };
        
        console.log(`🔧 [getVideosByCourseVersion] Processing video "${video.title}":`, {
          videoId: video._id,
          hasAccess: video.hasAccess,
          isLocked: video.isLocked,
          lockReason: video.lockReason,
          hasS3Key: !!video.s3Key,
          isFreePreview: video.isFreePreview
        });
        
        // Generate presigned URL if user has access to this video
        if (video.hasAccess && video.s3Key) {
          try {
            // Generating presigned URL for video
            console.log(`🔧 [getVideosByCourseVersion] Video MIME type: ${video.mimeType || 'not set'}`);
            const presignedUrl = await getSignedUrlForFile(video.s3Key, 3600, video.mimeType);
            videoObj.videoUrl = presignedUrl;
            videoObj.presignedUrl = presignedUrl; // Keep both for backward compatibility
            // Successfully generated URL for video
          } catch (error) {
            console.error(`❌ Error getting presigned URL for video ${video._id}:`, error);
            videoObj.videoUrl = null;
            videoObj.presignedUrl = null;
          }
        } else {
          // Skipping URL generation - no access or S3 key
          videoObj.videoUrl = null;
          videoObj.presignedUrl = null;
        }
        
        return videoObj;
      }));
    }
    
    res.json({
      success: true,
      data: {
        videos: videosWithAccess,
        count: videosWithAccess.length,
        userHasPurchased,
        hasFreePreviews
      }
    });
  } catch (error) {
    console.error('❌ Get videos by course version error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos',
      error: error.message
    });
  }
};

/**
 * Stream video (for enrolled students)
 */
exports.streamVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const isAdmin = req.user?.role === 'admin';
    
    console.log('[streamVideo] videoId:', videoId, 'user:', userId);
    
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    
    // Check video access using the new access control system
    const accessInfo = await checkVideoAccess(videoId, userId, isAdmin);
    
    if (!accessInfo.hasAccess) {
      return res.status(403).json({ 
        message: 'Access denied to this video',
        isLocked: true,
        lockReason: accessInfo.lockReason,
        requiresPurchase: accessInfo.lockReason === 'purchase_required'
      });
    }
    
    const url = await getSignedUrlForFile(video.s3Key, 3600, video.mimeType);
    res.json({ url });
  } catch (err) {
    console.error('[streamVideo] error:', err?.message || err);
    res.status(500).json({ message: 'Stream failed', error: err.message });
  }
};

/**
 * Toggle free preview status for a video (admin only)
 */
exports.toggleFreePreview = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { isFreePreview } = req.body;
    
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Update free preview status
    video.isFreePreview = isFreePreview;
    await video.save();
    
    res.json({
      success: true,
      message: `Video ${isFreePreview ? 'marked as' : 'removed from'} free preview`,
      data: {
        video: {
          id: video._id,
          title: video.title,
          isFreePreview: video.isFreePreview
        }
      }
    });
  } catch (error) {
    console.error('❌ Toggle free preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update free preview status',
      error: error.message
    });
  }
};

/**
 * Restore archived video
 */
exports.restoreVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    if (video.status !== 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Video is not archived'
      });
    }
    
    // Unarchive the video
    await video.unarchive();
    
    // Add back to course version
    const courseVersion = await CourseVersion.findOne({ 
      courseId: video.courseId, 
      versionNumber: video.courseVersion 
    });
    
    if (courseVersion) {
      courseVersion.videos.push(video._id);
      await courseVersion.save();
      await courseVersion.updateStatistics();
    }
    
    // Add back to main course if it's the current version
    const course = await Course.findById(video.courseId);
    if (course && course.currentVersion === video.courseVersion) {
      course.videos.push(video._id);
      await course.save();
    }
    
    res.json({
      success: true,
      message: 'Video restored successfully',
      data: {
        video
      }
    });
  } catch (error) {
    console.error('❌ Restore video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore video',
      error: error.message
    });
  }
};

/**
 * Get video statistics for a course
 */
exports.getVideoStatistics = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const videos = await Video.find({ courseId, status: 'active' });
    
    const statistics = {
      totalVideos: videos.length,
      totalDuration: videos.reduce((total, video) => {
        const duration = video.duration || '0:00';
        const [minutes, seconds] = duration.split(':').map(Number);
        return total + (minutes * 60 + seconds);
      }, 0),
      totalFileSize: videos.reduce((total, video) => total + (video.fileSize || 0), 0),
      byVersion: {}
    };
    
    // Group by version
    const videosByVersion = videos.reduce((acc, video) => {
      if (!acc[video.courseVersion]) {
        acc[video.courseVersion] = [];
      }
      acc[video.courseVersion].push(video);
      return acc;
    }, {});
    
    Object.keys(videosByVersion).forEach(version => {
      const versionVideos = videosByVersion[version];
      statistics.byVersion[version] = {
        count: versionVideos.length,
        duration: versionVideos.reduce((total, video) => {
          const duration = video.duration || '0:00';
          const [minutes, seconds] = duration.split(':').map(Number);
          return total + (minutes * 60 + seconds);
        }, 0),
        fileSize: versionVideos.reduce((total, video) => total + (video.fileSize || 0), 0)
      };
    });
    
    res.json({
      success: true,
      data: {
        statistics
      }
    });
  } catch (error) {
    console.error('❌ Get video statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get video statistics',
      error: error.message
    });
  }
}; 