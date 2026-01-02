const Video = require('../models/Video');
const Course = require('../models/Course');
const { checkVideoAccess } = require('../utils/purchaseUtils');
const drmService = require('../services/drmService');
const { getSignedUrlForFile } = require('../utils/s3CourseManager');

/**
 * Get video by ID with DRM protection
 */
exports.getVideoByIdWithDRM = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const isAdmin = req.user?.role === 'admin';
    
    console.log('[getVideoByIdWithDRM] videoId:', videoId, 'userId:', userId);
    
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

    // Generate DRM session for non-admin users
    let drmSession = null;
    let encryptedVideoData = null;
    
    if (!isAdmin) {
      try {
        // Generate DRM session
        drmSession = await drmService.generateDRMSession(userId, videoId, video.courseId);
        
        // Generate encrypted video URL
        if (video.s3Key) {
          encryptedVideoData = await drmService.generateEncryptedVideoUrl(
            video.s3Key, 
            drmSession.sessionId, 
            userId, 
            videoId
          );
        }
        
        console.log(`🔒 DRM session created for user ${userId}, video ${videoId}`);
      } catch (error) {
        console.error('❌ Failed to create DRM session:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to initialize video security'
        });
      }
    } else {
      // Admin users get direct access without DRM
      if (video.s3Key) {
        const videoUrl = await getSignedUrlForFile(video.s3Key, 3600, video.mimeType);
        encryptedVideoData = {
          encryptedUrl: videoUrl,
          securityHeaders: {},
          expiresIn: 3600,
          watermarkData: null
        };
      }
    }

    // Generate forensic watermark data
    const forensicWatermark = drmService.generateForensicWatermark(
      userId, 
      videoId, 
      drmSession?.sessionId || 'admin'
    );

    res.json({
      success: true,
      data: {
        video: {
          id: video._id,
          title: video.title,
          description: video.description,
          duration: video.duration,
          formattedDuration: video.formattedDuration,
          order: video.order,
          courseId: video.courseId,
          courseVersion: video.courseVersion,
          courseTitle: course.title,
          isFreePreview: video.isFreePreview,
          locked: false,
          hasAccess: true
        },
        drm: {
          enabled: !isAdmin,
          sessionId: drmSession?.sessionId || null,
          encryptedUrl: encryptedVideoData?.encryptedUrl || null,
          securityHeaders: encryptedVideoData?.securityHeaders || {},
          expiresIn: encryptedVideoData?.expiresIn || 0,
          watermarkData: encryptedVideoData?.watermarkData || null
        },
        forensic: {
          watermark: forensicWatermark.watermark,
          userId: forensicWatermark.userId,
          videoId: forensicWatermark.videoId,
          sessionId: forensicWatermark.sessionId,
          timestamp: forensicWatermark.timestamp,
          hash: forensicWatermark.hash
        },
        security: {
          drmEnabled: !isAdmin,
          watermarkingEnabled: !isAdmin,
          screenRecordingDetection: !isAdmin,
          extensionDetection: !isAdmin,
          sessionBasedAccess: !isAdmin
        }
      }
    });

  } catch (error) {
    console.error('❌ [getVideoByIdWithDRM] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Validate DRM session
 */
exports.validateDRMSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { videoId } = req.body;

    if (!sessionId || !userId || !videoId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    const validation = drmService.validateDRMSession(sessionId, userId, videoId);
    
    if (!validation.valid) {
      return res.status(403).json({
        success: false,
        message: 'Invalid DRM session',
        reason: validation.reason
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        session: {
          sessionId: validation.session.sessionId,
          expiresAt: validation.session.expiresAt,
          accessCount: validation.session.accessCount,
          maxAccessCount: validation.session.maxAccessCount
        }
      }
    });

  } catch (error) {
    console.error('❌ [validateDRMSession] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get course videos with DRM protection
 */
exports.getCourseVideosWithDRM = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { version = 1 } = req.query;
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const isAdmin = req.user?.role === 'admin';

    console.log(`[getCourseVideosWithDRM] courseId: ${courseId}, userId: ${userId}, version: ${version}`);

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get videos for the course
    const videos = await Video.find({ 
      courseId: courseId,
      courseVersion: parseInt(version)
    }).sort({ order: 1 });

    if (!videos || videos.length === 0) {
      return res.json({
        success: true,
        data: {
          course: {
            id: course._id,
            title: course.title,
            description: course.description,
            videos: []
          },
          userHasPurchased: false,
          drm: {
            enabled: false
          }
        }
      });
    }

    // Check if user has purchased the course (check first video to determine overall purchase status)
    const firstVideoAccess = await checkVideoAccess(videos[0]._id, userId, isAdmin);
    // User has purchased if they have access AND it's not just a free preview
    const coursePurchased = firstVideoAccess.hasAccess && !videos[0].isFreePreview;
    
    // Generate DRM sessions for each video (for non-admin users)
    const videosWithDRM = await Promise.all(videos.map(async (video) => {
      // IMPORTANT: Check access for EACH video individually to handle free previews correctly
      const videoAccess = await checkVideoAccess(video._id, userId, isAdmin);
      const hasAccess = videoAccess.hasAccess;
      const isLocked = !hasAccess;
      
      // Log access status for debugging
      console.log(`🔒 [DRM Controller] Video ${video._id.toString().substring(0, 8)}... access:`, {
        userId: userId || 'unauthenticated',
        hasAccess,
        isLocked,
        isFreePreview: video.isFreePreview,
        lockReason: videoAccess.lockReason
      });
      
      const videoObj = {
        id: video._id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        formattedDuration: video.formattedDuration,
        order: video.order,
        courseId: video.courseId,
        courseVersion: video.courseVersion,
        isFreePreview: video.isFreePreview,
        locked: isLocked,
        hasAccess: hasAccess,
        // IMPORTANT: Do not include video URL or DRM data for locked videos
        url: null, // Explicitly set to null for locked videos
        videoUrl: null, // Explicitly set to null for locked videos
        drm: {
          enabled: false,
          sessionId: null,
          encryptedUrl: null,
          watermarkData: null
        }
      };

      // Only generate DRM session and URLs if user has access
      if (!hasAccess) {
        // Video is locked - return early without any URLs
        return videoObj;
      }

      // Generate DRM session for non-admin users with access (only if user is authenticated)
      if (!isAdmin && userId && hasAccess) {
        try {
          const drmSession = await drmService.generateDRMSession(userId, video._id, courseId);
          
          if (video.s3Key) {
            try {
              const encryptedVideoData = await drmService.generateEncryptedVideoUrl(
                video.s3Key, 
                drmSession.sessionId, 
                userId, 
                video._id
              );
              
              videoObj.drm = {
                enabled: true,
                sessionId: drmSession.sessionId,
                encryptedUrl: encryptedVideoData.encryptedUrl,
                watermarkData: encryptedVideoData.watermarkData,
                expiresIn: encryptedVideoData.expiresIn
              };
            } catch (encryptionError) {
              console.error(`❌ Failed to generate encrypted video URL for video ${video._id}:`, encryptionError);
              // Fall back to regular signed URL (only if user still has access)
              if (hasAccess && !isLocked) {
                try {
                  const signedUrl = await getSignedUrlForFile(video.s3Key);
                  videoObj.url = signedUrl;
                  videoObj.videoUrl = signedUrl;
                } catch (fallbackError) {
                  console.error(`❌ Failed to generate fallback signed URL for video ${video._id}:`, fallbackError);
                  // Ensure URLs remain null on error
                  videoObj.url = null;
                  videoObj.videoUrl = null;
                }
              } else {
                // Video is locked, ensure no URLs
                videoObj.url = null;
                videoObj.videoUrl = null;
              }
            }
          }
        } catch (error) {
          console.error(`❌ Failed to create DRM session for video ${video._id}:`, error);
        }
      }

      // Provide fallback regular URL if no DRM URL is available (only if user has access and video is not locked)
      if (hasAccess && !isLocked && !videoObj.drm.encryptedUrl && video.s3Key) {
        try {
          const signedUrl = await getSignedUrlForFile(video.s3Key);
          videoObj.url = signedUrl;
          videoObj.videoUrl = signedUrl;
        } catch (error) {
          console.error(`❌ Failed to generate signed URL for video ${video._id}:`, error);
          // Keep URLs as null if generation fails
          videoObj.url = null;
          videoObj.videoUrl = null;
        }
      }
      
      // Final safety check: Ensure locked videos NEVER have URLs (double-check before returning)
      if (isLocked || !hasAccess) {
        videoObj.url = null;
        videoObj.videoUrl = null;
        videoObj.drm = {
          enabled: false,
          sessionId: null,
          encryptedUrl: null,
          watermarkData: null
        };
      }

      return videoObj;
    }));

    res.json({
      success: true,
      data: {
        course: {
          id: course._id,
          title: course.title,
          description: course.description,
          videos: videosWithDRM
        },
        userHasPurchased: coursePurchased,
        drm: {
          enabled: !isAdmin,
          totalSessions: drmService.getSessionStats().activeSessions
        }
      }
    });

  } catch (error) {
    console.error('❌ [getCourseVideosWithDRM] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Decrypt DRM video URL
 */
exports.decryptVideoUrl = async (req, res) => {
  try {
    console.log('🔓 [decryptVideoUrl] Request received:', {
      body: req.body,
      user: req.user ? { id: req.user.id, userId: req.user.userId } : 'No user'
    });
    
    const { encryptedUrl, sessionId } = req.body;
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    
    console.log('🔓 [decryptVideoUrl] Extracted data:', {
      encryptedUrl: encryptedUrl ? 'Present' : 'Missing',
      sessionId: sessionId ? 'Present' : 'Missing',
      userId: userId ? 'Present' : 'Missing'
    });
    
    if (!encryptedUrl || !sessionId) {
      console.log('❌ [decryptVideoUrl] Missing required parameters');
      return res.status(400).json({
        success: false,
        message: 'Encrypted URL and session ID are required'
      });
    }
    
    // Get the DRM session
    const session = drmService.getSession(sessionId);
    const sessionStats = drmService.getSessionStats();
    console.log('🔓 [decryptVideoUrl] Session lookup:', {
      sessionFound: !!session,
      sessionUserId: session?.userId,
      requestUserId: userId,
      sessionValid: session && session.userId === userId,
      totalSessions: sessionStats.totalSessions,
      activeSessions: sessionStats.activeSessions
    });
    
    if (!session || session.userId !== userId) {
      console.log('❌ [decryptVideoUrl] Invalid or expired DRM session');
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired DRM session'
      });
    }
    
    // Decrypt the URL
    console.log('🔓 [decryptVideoUrl] Attempting to decrypt URL...');
    const decryptedUrl = drmService.decryptUrl(encryptedUrl, session.sessionKey);
    console.log('✅ [decryptVideoUrl] URL decrypted successfully');
    
    res.json({
      success: true,
      data: {
        decryptedUrl,
        expiresIn: session.expiresIn
      }
    });
  } catch (error) {
    console.error('❌ [decryptVideoUrl] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decrypt video URL'
    });
  }
};

/**
 * Revoke DRM session
 */
exports.revokeDRMSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID required'
      });
    }

    const revoked = drmService.revokeSession(sessionId);
    
    if (revoked) {
      console.log(`🚫 DRM session revoked by user ${userId}: ${sessionId}`);
      res.json({
        success: true,
        message: 'DRM session revoked successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

  } catch (error) {
    console.error('❌ [revokeDRMSession] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get DRM session statistics (admin only)
 */
exports.getDRMStats = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const stats = drmService.getSessionStats();
    
    res.json({
      success: true,
      data: {
        sessions: stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [getDRMStats] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
