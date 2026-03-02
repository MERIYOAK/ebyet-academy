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
    // Parse bilingual title and description if they come as JSON strings
    let title = req.body.title;
    let description = req.body.description || '';
    
    // Try to parse if they're JSON strings
    try {
      if (typeof title === 'string' && title.startsWith('{')) {
        title = JSON.parse(title);
      }
      if (typeof description === 'string' && description.startsWith('{')) {
        description = JSON.parse(description);
      }
    } catch (e) {
      // If parsing fails, treat as regular string (backward compatibility)
      console.log('[uploadVideo] Title/description not JSON, using as string');
    }
    
    const { courseId, order, version: requestedVersion = 1, duration } = req.body;
    const isFreePreview = req.body.isFreePreview === 'true' || req.body.isFreePreview === true;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';
    
    console.log('[uploadVideo] courseId:', req.body?.courseId, 'title:', title, 'size:', req.file?.size, 'file:', req.file?.originalname, 'isFreePreview:', isFreePreview);
    
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

    // IMPORTANT: Always use the current version, not the requested version
    // This ensures we're always modifying the current version and creating a new one
    const currentVersionNumber = course.currentVersion || course.version || 1;
    console.log(`🔍 [uploadVideo] Course currentVersion: ${currentVersionNumber}, requestedVersion: ${requestedVersion}`);
    
    // Use a mutable variable for version number - start with current version
    let versionNumber = currentVersionNumber;

    // Get course version for the current version
    let courseVersion = await CourseVersion.findOne({ 
      courseId, 
      versionNumber: versionNumber 
    });

    if (!courseVersion) {
      return res.status(404).json({ 
        success: false,
        message: `Course version ${versionNumber} not found` 
      });
    }

    console.log(`🔍 [uploadVideo] Found courseVersion ${versionNumber}, course.currentVersion: ${course.currentVersion}`);

    // Check if this is initial upload (course has no enrollments)
    // During initial upload, all content goes to version 1
    // After enrollments exist, any changes create new versions
    const hasEnrollments = course.enrolledStudents && course.enrolledStudents.length > 0;
    const isInitialUpload = !hasEnrollments;
    
    console.log(`🔍 [uploadVideo] Course has ${course.enrolledStudents?.length || 0} enrollments. Is initial upload: ${isInitialUpload}`);
    
    // Only create a new version if:
    // 1. Course has enrollments (not initial upload) AND
    // 2. We're modifying the current version
    // During initial upload, all content goes to version 1
    const shouldCreateNewVersion = !isInitialUpload && course.currentVersion === versionNumber;
    
    if (shouldCreateNewVersion) {
      // Get existing videos for the current version - IMPORTANT: Query with explicit conditions
      let existingVideos = await Video.find({ 
        courseId: courseId.toString(), 
        courseVersion: versionNumber,
        status: { $ne: 'deleted' }
      }).lean(); // Use lean() to get plain objects
      
      console.log(`🔍 [uploadVideo] Found ${existingVideos.length} existing videos in version ${versionNumber}:`, 
        existingVideos.map(v => ({ id: v._id, title: v.title, version: v.courseVersion }))
      );
      
      // CRITICAL FIX: If no videos found in current version, check ALL versions
      // This handles cases where videos exist in older versions but weren't copied to current version
      if (existingVideos.length === 0) {
        console.log(`⚠️ [uploadVideo] No videos in version ${versionNumber}, checking all versions for this course...`);
        const allVideosForCourse = await Video.find({ 
          courseId: courseId.toString(), 
          status: { $ne: 'deleted' }
        }).lean();
        
        console.log(`🔍 [uploadVideo] Found ${allVideosForCourse.length} videos across all versions:`, 
          allVideosForCourse.map(v => ({ id: v._id, title: v.title, version: v.courseVersion }))
        );
        
        // Use videos from the latest version that has videos
        if (allVideosForCourse.length > 0) {
          const latestVersionWithVideos = Math.max(...allVideosForCourse.map(v => v.courseVersion));
          existingVideos = allVideosForCourse.filter(v => v.courseVersion === latestVersionWithVideos);
          console.log(`📹 [uploadVideo] Using ${existingVideos.length} videos from version ${latestVersionWithVideos} to copy to new version`);
        }
      }
      
      // Get existing materials for the current version
      const Material = require('../models/Material');
      const existingMaterials = await Material.find({ 
        courseId: courseId.toString(), 
        courseVersion: versionNumber,
        status: 'active'
      }).lean();
      
      console.log(`🔍 [uploadVideo] Found ${existingMaterials.length} existing materials in version ${versionNumber}`);
      
      // Always create a new version when modifying the current version
      // This ensures version history is preserved
      console.log(`🔄 [uploadVideo] Adding video to current version, creating new version...`);
        
        // Get the latest version to determine next version number
        const latestVersion = await CourseVersion.findOne({ 
          courseId: courseId.toString()
        }).sort({ versionNumber: -1 });
        
        // If latestVersion exists, increment it. Otherwise, use current version + 1
        const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : (versionNumber + 1);
        console.log(`📌 [uploadVideo] Creating version v${newVersionNumber} from v${versionNumber}`);
      
        // Create new version with existing content
        const newVersion = new CourseVersion({
          courseId,
          versionNumber: newVersionNumber,
          title: courseVersion.title,
          description: courseVersion.description,
          price: courseVersion.price,
          category: courseVersion.category,
          level: courseVersion.level,
          thumbnailURL: courseVersion.thumbnailURL,
          thumbnailS3Key: courseVersion.thumbnailS3Key,
          s3FolderPath: getCourseFolderPath(typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || ''), newVersionNumber),
          createdBy: adminEmail,
          changeLog: `Version ${newVersionNumber} created: Video added`,
          videos: [], // Will be populated after copying videos
          materials: [], // Will be populated after copying materials
          status: courseVersion.status,
          isPublic: courseVersion.isPublic
        });
        
        // Copy existing videos to the new version FIRST
        if (existingVideos.length > 0) {
          console.log(`🎬 [uploadVideo] Copying ${existingVideos.length} videos from v${versionNumber} to v${newVersionNumber}...`);
          const videoCopyPromises = existingVideos.map((video, index) => {
            console.log(`   📹 Copying video ${index + 1}/${existingVideos.length}: ${video.title} (ID: ${video._id})`);
            return Video.create({
              title: video.title,
              description: video.description,
              s3Key: video.s3Key,
              courseId: video.courseId,
              courseVersion: newVersionNumber,
              duration: video.duration,
              order: video.order,
              fileSize: video.fileSize,
              mimeType: video.mimeType,
              originalName: video.originalName,
              uploadedBy: video.uploadedBy,
              isFreePreview: video.isFreePreview || false,
              status: video.status || 'active'
            });
          });
          const copiedVideos = await Promise.all(videoCopyPromises);
          // Update the new version's videos array with the copied video IDs
          newVersion.videos = copiedVideos.map(v => v._id);
          await newVersion.save();
          console.log(`✅ [uploadVideo] Successfully copied ${copiedVideos.length} videos to version v${newVersionNumber}. Video IDs:`, 
            copiedVideos.map(v => v._id.toString())
          );
        } else {
          await newVersion.save();
          console.log(`📝 [uploadVideo] No videos to copy, saved empty version v${newVersionNumber}`);
        }
        
        // Copy existing materials to the new version (existingMaterials already fetched above)
        if (existingMaterials.length > 0) {
          console.log(`📦 [uploadVideo] Copying ${existingMaterials.length} materials to new version v${newVersionNumber}...`);
          const materialUpdatePromises = existingMaterials.map(material => {
            return Material.create({
              title: material.title,
              description: material.description,
              s3Key: material.s3Key,
              courseId: material.courseId,
              courseVersion: newVersionNumber,
              order: material.order,
              fileSize: material.fileSize,
              mimeType: material.mimeType,
              originalName: material.originalName,
              fileExtension: material.fileExtension,
              uploadedBy: material.uploadedBy,
              status: 'active'
            });
          });
          const copiedMaterials = await Promise.all(materialUpdatePromises);
          // Update the new version's materials array with the copied material IDs
          newVersion.materials = copiedMaterials.map(m => m._id);
          await newVersion.save();
          console.log(`✅ [uploadVideo] Copied ${copiedMaterials.length} materials to version v${newVersionNumber}. Material IDs:`, 
            copiedMaterials.map(m => m._id.toString())
          );
        } else {
          newVersion.materials = [];
          await newVersion.save();
          console.log(`📝 [uploadVideo] No materials to copy to version v${newVersionNumber}`);
        }
        
        // Update course to point to new version
        course.currentVersion = newVersionNumber;
        course.version = newVersionNumber;
        course.lastModifiedBy = adminEmail;
        await course.save();
        
        // Use the new version for adding the video
        courseVersion = newVersion;
        versionNumber = newVersionNumber;
        
        console.log(`✅ [uploadVideo] Created new version v${newVersionNumber} and set as current`);
    }
    
    // Validate file size
    validateFile(req.file, ['video/mp4', 'video/webm', 'video/ogg'], 500 * 1024 * 1024); // 500MB max
    
    console.log('🎬 [uploadVideo] Processing duration from form input...');
    
    // Duration is required
    if (!duration) {
      return res.status(400).json({
        success: false,
        message: 'Duration is required. Please enter video duration in MM:SS or HH:MM:SS format.'
      });
    }
    
    // Parse duration from form input (MM:SS or HH:MM:SS format)
    let detectedDuration = 0;
    let videoMetadata = null;
    
    try {
      detectedDuration = parseDurationToSeconds(duration);
      console.log(`✅ [uploadVideo] Duration parsed from input: ${duration} = ${detectedDuration} seconds`);
    } catch (error) {
      console.error(`❌ [uploadVideo] Duration parsing failed:`, error);
      return res.status(400).json({
        success: false,
        message: `Invalid duration format: ${duration}. Please use MM:SS or HH:MM:SS format.`
      });
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
    const S3_ROOT_PREFIX = process.env.S3_ROOT_PREFIX || 'ibyet-investing-folder';
    const courseTitleString = typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || '');
    
    // IMPORTANT: Use the updated versionNumber (which may have been changed to newVersionNumber above)
    console.log(`📁 [uploadVideo] Uploading to S3 with versionNumber: ${versionNumber}, courseId: ${courseId}`);
    const s3Key = `${S3_ROOT_PREFIX}/courses/${courseTitleString.replace(/[^a-zA-Z0-9\s-]/g, '_').replace(/\s+/g, '_')}/v${versionNumber}/videos/${Date.now()}_${req.file.originalname}`;
    console.log(`📁 [uploadVideo] Generated S3 key: ${s3Key}`);
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
      courseVersion: versionNumber,
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
    console.log(`📝 [uploadVideo] Added new video ${video._id} to courseVersion.videos. Current array length: ${courseVersion.videos.length}`);
    
    // CRITICAL FIX: Rebuild courseVersion.videos array from database to ensure ALL videos are included
    // This ensures that even if there was any issue with array maintenance, we have the correct list
    // IMPORTANT: Reload courseVersion from database first to get latest state, then query all videos
    const CourseVersionModel = require('../models/CourseVersion');
    const reloadedCourseVersion = await CourseVersionModel.findById(courseVersion._id);
    console.log(`🔄 [uploadVideo] Reloaded courseVersion from DB. Videos array length: ${reloadedCourseVersion.videos.length}`);
    
    // Query ALL videos for this version from database (source of truth)
    const allVideosInVersion = await Video.find({ 
      courseId: courseId.toString(), 
      courseVersion: versionNumber,
      status: { $ne: 'deleted' }
    });
    
    console.log(`🔍 [uploadVideo] Querying videos for courseId: ${courseId.toString()}, version: ${versionNumber}`);
    console.log(`🔍 [uploadVideo] Found ${allVideosInVersion.length} videos in database for version v${versionNumber}:`, 
      allVideosInVersion.map(v => ({ id: v._id.toString(), title: v.title, version: v.courseVersion }))
    );
    
    // Verify we have all expected videos
    const expectedVideoCount = reloadedCourseVersion.videos.length;
    if (allVideosInVersion.length !== expectedVideoCount) {
      console.warn(`⚠️ [uploadVideo] Mismatch! courseVersion.videos has ${expectedVideoCount} IDs, but database query found ${allVideosInVersion.length} videos`);
      console.warn(`   courseVersion.videos IDs:`, reloadedCourseVersion.videos.map(id => id.toString()));
      console.warn(`   Database video IDs:`, allVideosInVersion.map(v => v._id.toString()));
    }
    
    // Update courseVersion.videos to match ALL videos from database (ensures nothing is missing)
    reloadedCourseVersion.videos = allVideosInVersion.map(v => v._id);
    await reloadedCourseVersion.save();
    
    // Update our local reference
    courseVersion = reloadedCourseVersion;
    
    console.log(`✅ [uploadVideo] Rebuilt courseVersion.videos with ${allVideosInVersion.length} videos from version v${versionNumber}`);
    console.log(`✅ [uploadVideo] Final video IDs in courseVersion:`, courseVersion.videos.map(id => id.toString()));
    
    // Update course.videos to include all videos from the current version
    if (course.currentVersion === versionNumber) {
      // Update course.videos to match all videos in the current version
      course.videos = allVideosInVersion.map(v => v._id);
      course.lastModifiedBy = adminEmail;
      await course.save();
      
      console.log(`✅ [uploadVideo] Updated course.videos with ${allVideosInVersion.length} videos from version v${versionNumber}`);
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
 * Update video (title, description, order, or replace file)
 * NOTE: This does NOT create a new version - only adding/deleting videos triggers version increments
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
      const courseTitleString = typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || '');
      const uploadResult = await uploadCourseFile(req.file, 'video', courseTitleString, video.courseVersion);
      
      s3Key = uploadResult.s3Key;
      // New S3 key generated
    }
    
    // Update video fields
    video.title = req.body.title || video.title;
    video.description = req.body.description || video.description;
    video.order = req.body.order !== undefined ? parseInt(req.body.order) : video.order;
    video.s3Key = s3Key;
    
    // Update duration if provided (can be number in seconds or string in MM:SS format)
    if (req.body.duration !== undefined) {
      if (typeof req.body.duration === 'number') {
        video.duration = req.body.duration;
      } else if (typeof req.body.duration === 'string') {
        // Try to parse MM:SS or HH:MM:SS format
        const parts = req.body.duration.split(':');
        if (parts.length === 2) {
          // MM:SS format
          const minutes = parseInt(parts[0]) || 0;
          const seconds = parseInt(parts[1]) || 0;
          video.duration = minutes * 60 + seconds;
        } else if (parts.length === 3) {
          // HH:MM:SS format
          const hours = parseInt(parts[0]) || 0;
          const minutes = parseInt(parts[1]) || 0;
          const seconds = parseInt(parts[2]) || 0;
          video.duration = hours * 3600 + minutes * 60 + seconds;
        } else {
          // Try to parse as number
          const numValue = parseInt(req.body.duration);
          if (!isNaN(numValue)) {
            video.duration = numValue;
          }
        }
      } else {
        // If it's already a number, use it directly
        video.duration = req.body.duration;
      }
      console.log(`✅ [updateVideo] Duration updated to: ${video.duration} seconds`);
    }
    
    // If a new file is uploaded, update file metadata (but not duration - must be provided manually)
    if (req.file) {
      video.fileSize = req.file.size;
      video.mimeType = req.file.mimetype;
      video.originalName = req.file.originalname;
      
      // Optionally detect other metadata (width, height, fps, etc.) but not duration
      // Duration must be provided manually via req.body.duration
      try {
        console.log('🎬 [updateVideo] Detecting video metadata (excluding duration)...');
        const videoMetadata = await getVideoMetadata(req.file);
        
        // Update additional metadata (but not duration)
        video.width = videoMetadata.width;
        video.height = videoMetadata.height;
        video.fps = videoMetadata.fps;
        video.videoCodec = videoMetadata.videoCodec;
        video.audioCodec = videoMetadata.audioCodec;
        video.bitrate = videoMetadata.bitrate;
        console.log(`✅ [updateVideo] Video metadata updated (duration not auto-detected)`);
      } catch (metadataError) {
        console.error(`❌ [updateVideo] Metadata detection failed:`, metadataError);
        // Continue without metadata if detection fails
      }
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
    console.log(`   - Version: ${video.courseVersion}`);
    
    // CRITICAL: DO NOT delete the file from S3!
    // The file must remain in S3 so that students who purchased earlier versions
    // can still access the video. We only remove the database reference for the new version.
    // 
    // If the video is in the current version, a new version will be created below
    // that doesn't include this video. The old version still has the reference,
    // so students with access to that version can still access the file.
    //
    // If the video is in an older version, we should not delete it at all.
    
    console.log(`🔒 [deleteVideo] S3 file will be preserved for students with earlier versions`);
    
    // Get course and course version
    const course = await Course.findById(video.courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }
    
    const courseVersion = await CourseVersion.findOne({ 
      courseId: video.courseId, 
      versionNumber: video.courseVersion 
    });
    
    if (!courseVersion) {
      console.log(`⚠️ [deleteVideo] CourseVersion not found for version ${video.courseVersion}, proceeding with simple deletion`);
      // If CourseVersion doesn't exist, just remove from course and mark as deleted
      if (Array.isArray(course.videos)) {
        course.videos = course.videos.filter(vid => vid.toString() !== video._id.toString());
      } else {
        course.videos = [];
      }
      await course.save();
      
      // Mark video as deleted
      video.status = 'deleted';
      await video.save();
      
      return res.json({
        success: true,
        message: 'Video removed (CourseVersion not found, simple deletion performed).',
        data: {
          videoId: video._id,
          s3FilePreserved: true
        }
      });
    } else {
      // Auto-create new version if modifying the current version
      // During initial upload (only version 1 exists), deletions stay in version 1
      // After initial upload (multiple versions exist), deleting content creates a new version
      let targetVersion = courseVersion;
      let targetVersionNumber = video.courseVersion;
      
      const currentVersion = course.currentVersion || course.version || 1;
      if (course && currentVersion === video.courseVersion) {
        // Check if this is initial upload (course has no enrollments)
        // During initial upload, deletions stay in version 1
        // After enrollments exist, deletions create new versions
        const hasEnrollments = course.enrolledStudents && course.enrolledStudents.length > 0;
        const isInitialUpload = !hasEnrollments;
        
        if (isInitialUpload) {
          // Initial upload: Just remove from version 1, don't create new version
          console.log(`📝 [deleteVideo] Initial upload mode: Removing video from version 1 (no enrollments yet)`);
          
          // Remove from course's videos array
          if (Array.isArray(course.videos)) {
            course.videos = course.videos.filter(vid => vid.toString() !== video._id.toString());
          } else {
            course.videos = [];
          }
          await course.save();
          
          // Remove from courseVersion's videos array
          if (courseVersion) {
            if (Array.isArray(courseVersion.videos)) {
              courseVersion.videos = courseVersion.videos.filter(vid => vid.toString() !== video._id.toString());
            } else {
              courseVersion.videos = [];
            }
            await courseVersion.save();
            try {
              await courseVersion.updateStatistics();
              console.log(`✅ [deleteVideo] Video removed from CourseVersion v${video.courseVersion}`);
            } catch (statsError) {
              console.error(`⚠️ [deleteVideo] Error updating statistics:`, statsError);
              // Continue even if statistics update fails
            }
          }
          
          // Mark video as deleted so it doesn't appear in queries, but keep the database record and S3 file for potential restoration
          video.status = 'deleted';
          await video.save();
          console.log(`✅ [deleteVideo] Video marked as deleted (status: 'deleted')`);
          
          // DO NOT delete from database or S3 - preserve for potential restoration
          console.log(`🔒 [deleteVideo] Video database record and S3 file preserved for potential restoration`);
          return res.json({
            success: true,
            message: 'Video removed from version 1 during initial upload. File preserved.',
            data: {
              videoId: video._id,
              removedFromVersion: 1,
              s3FilePreserved: true
            }
          });
        }
        
        // Course has enrollments: Create new version without this video
        console.log(`🔄 [deleteVideo] Deleting video from current version, creating new version (course has ${course.enrolledStudents.length} enrollments)...`);
        
        // Get the latest version to determine next version number
        const latestVersion = await CourseVersion.findOne({ 
          courseId: video.courseId 
        }).sort({ versionNumber: -1 });
        
        // If latestVersion exists, increment it. Otherwise, use current version + 1
        const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : (video.courseVersion + 1);
        const adminEmail = req.admin?.email || req.user?.email || 'admin';
          
          // Get existing videos (excluding the one being deleted)
          const remainingVideos = await Video.find({ 
            courseId: video.courseId, 
            courseVersion: video.courseVersion,
            status: { $ne: 'deleted' },
            _id: { $ne: video._id } // Exclude the video being deleted
          });
          
          // Create new version (videos array will be populated after copying videos)
          const newVersion = new CourseVersion({
            courseId: video.courseId,
            versionNumber: newVersionNumber,
            title: courseVersion.title,
            description: courseVersion.description,
            price: courseVersion.price,
            category: courseVersion.category,
            level: courseVersion.level,
            thumbnailURL: courseVersion.thumbnailURL,
            thumbnailS3Key: courseVersion.thumbnailS3Key,
            s3FolderPath: getCourseFolderPath(typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || ''), newVersionNumber),
            createdBy: adminEmail,
            changeLog: `Version ${newVersionNumber} created: Video removed`,
            videos: [], // Will be populated after copying videos
            materials: [], // Will be populated after copying materials
            status: courseVersion.status,
            isPublic: courseVersion.isPublic
          });
          
          // Copy remaining videos to the new version FIRST
          if (remainingVideos.length > 0) {
            console.log(`🎬 [deleteVideo] Copying ${remainingVideos.length} videos to new version v${newVersionNumber}...`);
            const videoCopyPromises = remainingVideos.map(v => {
              return Video.create({
                title: v.title,
                description: v.description,
                s3Key: v.s3Key,
                courseId: v.courseId,
                courseVersion: newVersionNumber,
                duration: v.duration,
                order: v.order,
                fileSize: v.fileSize,
                mimeType: v.mimeType,
                originalName: v.originalName,
                uploadedBy: v.uploadedBy,
                isFreePreview: v.isFreePreview || false,
                status: v.status || 'active'
              });
            });
            const copiedVideos = await Promise.all(videoCopyPromises);
            // Update the new version's videos array with the copied video IDs
            newVersion.videos = copiedVideos.map(v => v._id);
            await newVersion.save();
            console.log(`✅ [deleteVideo] Copied ${remainingVideos.length} videos to version v${newVersionNumber}`);
          } else {
            await newVersion.save();
          }
          
          // Copy existing materials to the new version
          const Material = require('../models/Material');
          const existingMaterials = await Material.find({ 
            courseId: video.courseId, 
            courseVersion: video.courseVersion,
            status: 'active'
          });
          
          if (existingMaterials.length > 0) {
            console.log(`📦 [deleteVideo] Copying ${existingMaterials.length} materials to new version v${newVersionNumber}...`);
            const materialUpdatePromises = existingMaterials.map(material => {
              return Material.create({
                title: material.title,
                description: material.description,
                s3Key: material.s3Key,
                courseId: material.courseId,
                courseVersion: newVersionNumber,
                order: material.order,
                fileSize: material.fileSize,
                mimeType: material.mimeType,
                originalName: material.originalName,
                fileExtension: material.fileExtension,
                uploadedBy: material.uploadedBy,
                status: 'active'
              });
            });
            const copiedMaterials = await Promise.all(materialUpdatePromises);
            // Update the new version's materials array with the copied material IDs
            newVersion.materials = copiedMaterials.map(m => m._id);
            await newVersion.save();
            console.log(`✅ [deleteVideo] Copied ${copiedMaterials.length} materials to version v${newVersionNumber}`);
          } else {
            newVersion.materials = [];
            await newVersion.save();
            console.log(`📝 [deleteVideo] No materials to copy to version v${newVersionNumber}`);
          }
          
          // Update statistics for the new version
          // Ensure all videos are saved before calculating statistics
          await newVersion.updateStatistics();
          console.log(`📊 [deleteVideo] Statistics updated for version v${newVersionNumber}`);
          
          // Update course to point to new version
          course.currentVersion = newVersionNumber;
          course.version = newVersionNumber;
          course.lastModifiedBy = adminEmail;
          // Remove video from course's video array
          if (Array.isArray(course.videos)) {
            course.videos = course.videos.filter(vid => vid.toString() !== video._id.toString());
          } else {
            course.videos = [];
          }
          await course.save();
          
          // Use the new version
          targetVersion = newVersion;
          targetVersionNumber = newVersionNumber;
          
          console.log(`✅ [deleteVideo] Created new version v${newVersionNumber} and set as current`);
          // CRITICAL: DO NOT delete the video from database or S3!
          // The video file must remain in S3 so that students who purchased earlier versions
          // can still access it. We've created a new version without it, but the old version
          // still has the reference, so students with access to that version can still access the file.
          console.log(`🔒 [deleteVideo] Video database record and S3 file preserved for students with earlier versions`);
          return res.json({
            success: true,
            message: 'Video removed from current version. File preserved for students with earlier versions.',
            data: {
              videoId: video._id,
              removedFromVersion: newVersionNumber,
              stillAvailableInVersion: video.courseVersion,
              s3FilePreserved: true
            }
          });
      } else {
        // Video is in an older version - DO NOT DELETE
        // Students with access to that version need this video
        const currentVersion = course.currentVersion || course.version || 1;
        console.log(`⚠️ [deleteVideo] Video is in version ${video.courseVersion}, but current version is ${currentVersion}`);
        console.log(`   Keeping video for students who purchased version ${video.courseVersion}`);
        return res.json({
          success: true,
          message: 'Video is in an older version and cannot be deleted. Students with access to that version need this video.',
          data: { 
            videoId: video._id,
            videoVersion: video.courseVersion,
            currentVersion: currentVersion
          }
        });
      }
    }
    
    // If we reach here, something went wrong - video should have been handled above
    // Return an error to prevent accidental deletion
    console.error(`⚠️ [deleteVideo] Video deletion reached unexpected code path. Preserving video.`);
    return res.status(400).json({
      success: false,
      message: 'Video deletion could not be processed. Video preserved for safety.',
      data: { videoId: video._id }
    });
  } catch (err) {
    console.error('[deleteVideo] error:', err?.message || err);
    console.error('[deleteVideo] error stack:', err?.stack);
    res.status(500).json({ 
      success: false,
      message: 'Delete failed', 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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