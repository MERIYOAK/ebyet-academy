const Course = require('../models/Course');
const User = require('../models/User');
const Video = require('../models/Video');

const getUserIdFromRequest = (req) => req.user?.userId || req.user?.id || req.user?._id || null;
const toIdString = (value) => (value ? value.toString() : '');

const getEnrollment = (course, userId) => {
  if (!course || !userId) return null;
  return course.enrolledStudents.find(
    (enrollment) => enrollment.userId && enrollment.userId.toString() === userId.toString()
  );
};

const buildVideoProgressPayload = (progressEntry, fallbackTotalDuration = 0) => {
  const totalDuration = Number(progressEntry?.totalDuration || fallbackTotalDuration || 0);
  const watchedDuration = Math.max(0, Math.min(Number(progressEntry?.watchedDuration || 0), totalDuration || Number.MAX_SAFE_INTEGER));
  const watchedPercentage = totalDuration > 0 ? Math.min(100, Math.round((watchedDuration / totalDuration) * 100)) : 0;
  const completionPercentage = Number(progressEntry?.completionPercentage || watchedPercentage || 0);
  const isCompleted = Boolean(progressEntry?.isCompleted || completionPercentage >= 90 || watchedPercentage >= 90);

  return {
    watchedDuration,
    totalDuration,
    watchedPercentage,
    completionPercentage,
    isCompleted,
    lastPosition: Number(progressEntry?.lastPosition || watchedDuration || 0),
    lastWatchedAt: progressEntry?.lastWatchedAt || null
  };
};

const computeOverallProgress = (course, enrollment) => {
  const totalVideos = Array.isArray(course?.videos) ? course.videos.length : 0;
  const completedVideos = Array.isArray(enrollment?.completedVideos) ? enrollment.completedVideos.length : 0;
  const totalProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

  return {
    totalVideos,
    completedVideos,
    totalProgress,
    lastWatchedVideo: enrollment?.lastWatchedVideo || null,
    lastWatchedPosition: Number(enrollment?.lastWatchedPosition || 0)
  };
};

/**
 * Helper function to calculate total duration from video array
 */
const calculateTotalDuration = async (videoIds) => {
  try {
    if (!videoIds || videoIds.length === 0) {
      return '0:00';
    }
    
    const videos = await Video.find({ _id: { $in: videoIds } }).select('duration');
    
    let totalSeconds = 0;
    videos.forEach(video => {
      // Video model stores duration as Number (seconds), not string
      if (video.duration && typeof video.duration === 'number') {
        totalSeconds += video.duration;
      }
    });
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  } catch (error) {
    console.error('âŒ [calculateTotalDuration] Error:', error);
    return '0:00';
  }
};

/**
 * Get simplified dashboard data (without progress tracking)
 */
exports.getDashboard = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    
    // Get user with purchased courses
    const user = await User.findById(userId)
      .populate('purchasedCourses', 'title description thumbnailURL price category level status isPublic videos');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Return simplified course data with calculated duration
    // Filter out inactive and archived courses - only show active courses
    user.purchasedCourses.forEach((course, index) => {
    });
    
    const activeCourses = user.purchasedCourses.filter(course => 
      course.status === 'active' && course.isPublic !== false
    );
    
    
    const courses = await Promise.all(activeCourses.map(async (course) => {
      const totalDuration = await calculateTotalDuration(course.videos);
      
      return {
        _id: course._id,
        title: course.title,
        description: course.description,
        thumbnailURL: course.thumbnailURL,
        price: course.price,
        category: course.category,
        level: course.level,
        status: course.status,
        isPublic: course.isPublic,
        tags: course.tags || [],
        totalLessons: course.videos ? course.videos.length : 0,
        enrolledStudents: course.enrolledStudents || course.students || 0,
        instructor: course.instructor || '',
        duration: totalDuration, // Use calculated total duration
        // Removed progress-related fields
        // progress: 0,
        // completedLessons: 0,
        // isCompleted: false,
        // lastAccessedAt: null,
        // certificate: null
      };
    }));
    
    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePicture: user.profilePicture
        },
        courses: courses,
        // Removed progress statistics
        // stats: {
        //   totalCourses: courses.length,
        //   completedCourses: 0,
        //   totalProgress: 0,
        //   certificates: 0
        // }
      }
    });
    
  } catch (error) {
    console.error('âŒ [Progress Dashboard] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

/**
 * Get progress for a full course (all videos + overall progress)
 */
exports.getCourseProgress = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const course = await Course.findById(courseId).select('videos enrolledStudents');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const enrollment = getEnrollment(course, userId);
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'User is not enrolled in this course' });
    }

    const progressMap = new Map();
    (enrollment.videoProgress || []).forEach((entry) => {
      progressMap.set(toIdString(entry.videoId), entry);
    });

    const videos = course.videos.map((videoId) => {
      const key = toIdString(videoId);
      const entry = progressMap.get(key);
      const payload = buildVideoProgressPayload(entry);
      return {
        _id: key,
        videoId: key,
        progress: payload
      };
    });

    return res.json({
      success: true,
      data: {
        videos,
        overallProgress: computeOverallProgress(course, enrollment)
      }
    });
  } catch (error) {
    console.error('âŒ [Progress] getCourseProgress error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch course progress',
      error: error.message
    });
  }
};

/**
 * Save/update progress for a specific course video
 */
exports.updateProgress = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { courseId, videoId, watchedDuration = 0, totalDuration = 0, timestamp = 0 } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!courseId || !videoId) {
      return res.status(400).json({ success: false, message: 'courseId and videoId are required' });
    }

    const course = await Course.findById(courseId).select('videos enrolledStudents');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const videoExistsInCourse = course.videos.some((id) => toIdString(id) === toIdString(videoId));
    if (!videoExistsInCourse) {
      return res.status(404).json({ success: false, message: 'Video not found in this course' });
    }

    const enrollment = getEnrollment(course, userId);
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'User is not enrolled in this course' });
    }

    if (!Array.isArray(enrollment.videoProgress)) {
      enrollment.videoProgress = [];
    }

    const normalizedTotal = Math.max(0, Number(totalDuration || 0));
    const baseDuration = Number(watchedDuration || timestamp || 0);
    const normalizedWatched = normalizedTotal > 0
      ? Math.max(0, Math.min(baseDuration, normalizedTotal))
      : Math.max(0, baseDuration);
    const watchedPercentage = normalizedTotal > 0 ? Math.min(100, Math.round((normalizedWatched / normalizedTotal) * 100)) : 0;
    const completionPercentage = watchedPercentage;
    const isCompleted = completionPercentage >= 90;

    let videoProgressEntry = enrollment.videoProgress.find(
      (entry) => toIdString(entry.videoId) === toIdString(videoId)
    );

    if (!videoProgressEntry) {
      videoProgressEntry = {
        videoId,
        watchedDuration: 0,
        totalDuration: normalizedTotal,
        watchedPercentage: 0,
        completionPercentage: 0,
        isCompleted: false,
        lastPosition: 0,
        lastWatchedAt: new Date()
      };
      enrollment.videoProgress.push(videoProgressEntry);
    }

    // Never regress watched duration unless the user intentionally seeks forward from zero later.
    videoProgressEntry.watchedDuration = Math.max(Number(videoProgressEntry.watchedDuration || 0), normalizedWatched);
    videoProgressEntry.totalDuration = Math.max(Number(videoProgressEntry.totalDuration || 0), normalizedTotal);
    const effectiveTotal = Number(videoProgressEntry.totalDuration || normalizedTotal);
    const effectiveWatchedPercentage = effectiveTotal > 0
      ? Math.min(100, Math.round((Number(videoProgressEntry.watchedDuration || 0) / effectiveTotal) * 100))
      : watchedPercentage;
    videoProgressEntry.watchedPercentage = Math.max(Number(videoProgressEntry.watchedPercentage || 0), effectiveWatchedPercentage);
    videoProgressEntry.completionPercentage = Math.max(Number(videoProgressEntry.completionPercentage || 0), completionPercentage);
    videoProgressEntry.isCompleted = Boolean(videoProgressEntry.isCompleted || isCompleted);
    videoProgressEntry.lastPosition = normalizedWatched;
    videoProgressEntry.lastWatchedAt = new Date();

    enrollment.lastWatchedVideo = videoId;
    enrollment.lastWatchedPosition = normalizedWatched;
    enrollment.lastAccessedAt = new Date();

    const alreadyCompleted = (enrollment.completedVideos || []).some(
      (completedId) => toIdString(completedId) === toIdString(videoId)
    );

    if (videoProgressEntry.isCompleted && !alreadyCompleted) {
      enrollment.completedVideos.push(videoId);
    }

    enrollment.progress = computeOverallProgress(course, enrollment).totalProgress;

    course.markModified('enrolledStudents');
    await course.save();

    return res.json({
      success: true,
      data: {
        skipped: false,
        videoProgress: buildVideoProgressPayload(videoProgressEntry, effectiveTotal),
        courseProgress: computeOverallProgress(course, enrollment)
      }
    });
  } catch (error) {
    console.error('âŒ [Progress] updateProgress error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update progress',
      error: error.message
    });
  }
};

/**
 * Get resume position for a course+video
 */
exports.getResumePosition = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { courseId, videoId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const course = await Course.findById(courseId).select('enrolledStudents');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const enrollment = getEnrollment(course, userId);
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'User is not enrolled in this course' });
    }

    const entry = (enrollment.videoProgress || []).find(
      (progressItem) => toIdString(progressItem.videoId) === toIdString(videoId)
    );

    const resumePosition = Number(entry?.lastPosition || 0);

    return res.json({
      success: true,
      data: {
        resumePosition: Number.isFinite(resumePosition) ? resumePosition : 0
      }
    });
  } catch (error) {
    console.error('âŒ [Progress] getResumePosition error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get resume position',
      error: error.message
    });
  }
};

/**
 * Mark a video complete
 */
exports.completeVideo = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { courseId, videoId } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!courseId || !videoId) {
      return res.status(400).json({ success: false, message: 'courseId and videoId are required' });
    }

    const course = await Course.findById(courseId).select('videos enrolledStudents');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const enrollment = getEnrollment(course, userId);
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'User is not enrolled in this course' });
    }

    if (!Array.isArray(enrollment.videoProgress)) {
      enrollment.videoProgress = [];
    }

    let videoProgressEntry = enrollment.videoProgress.find(
      (entry) => toIdString(entry.videoId) === toIdString(videoId)
    );

    if (!videoProgressEntry) {
      videoProgressEntry = {
        videoId,
        watchedDuration: 0,
        totalDuration: 0,
        watchedPercentage: 100,
        completionPercentage: 100,
        isCompleted: true,
        lastPosition: 0,
        lastWatchedAt: new Date()
      };
      enrollment.videoProgress.push(videoProgressEntry);
    } else {
      videoProgressEntry.isCompleted = true;
      videoProgressEntry.completionPercentage = Math.max(Number(videoProgressEntry.completionPercentage || 0), 100);
      videoProgressEntry.watchedPercentage = Math.max(Number(videoProgressEntry.watchedPercentage || 0), 100);
      if (Number(videoProgressEntry.totalDuration || 0) > 0) {
        videoProgressEntry.watchedDuration = Number(videoProgressEntry.totalDuration);
        videoProgressEntry.lastPosition = Number(videoProgressEntry.totalDuration);
      }
      videoProgressEntry.lastWatchedAt = new Date();
    }

    const alreadyCompleted = (enrollment.completedVideos || []).some(
      (completedId) => toIdString(completedId) === toIdString(videoId)
    );
    if (!alreadyCompleted) {
      enrollment.completedVideos.push(videoId);
    }

    enrollment.lastWatchedVideo = videoId;
    enrollment.lastAccessedAt = new Date();
    enrollment.progress = computeOverallProgress(course, enrollment).totalProgress;

    // Mongoose doesn't auto-detect mutations on nested subdocuments found via Array.find()
    course.markModified('enrolledStudents');
    await course.save();

    return res.json({
      success: true,
      data: {
        videoProgress: buildVideoProgressPayload(videoProgressEntry),
        courseProgress: computeOverallProgress(course, enrollment)
      }
    });
  } catch (error) {
    console.error('âŒ [Progress] completeVideo error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete video',
      error: error.message
    });
  }
};

/**
 * Get next video in the course order
 */
exports.getNextVideo = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { courseId, videoId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const course = await Course.findById(courseId).select('videos enrolledStudents');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const enrollment = getEnrollment(course, userId);
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'User is not enrolled in this course' });
    }

    const currentIndex = course.videos.findIndex((id) => toIdString(id) === toIdString(videoId));
    if (currentIndex === -1 || currentIndex >= course.videos.length - 1) {
      return res.json({
        success: true,
        data: { nextVideo: null }
      });
    }

    const nextVideoId = course.videos[currentIndex + 1];
    return res.json({
      success: true,
      data: {
        nextVideo: { _id: nextVideoId }
      }
    });
  } catch (error) {
    console.error('âŒ [Progress] getNextVideo error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get next video',
      error: error.message
    });
  }
};