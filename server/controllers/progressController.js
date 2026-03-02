const Course = require('../models/Course');
const User = require('../models/User');
const Video = require('../models/Video');

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
    console.error('❌ [calculateTotalDuration] Error:', error);
    return '0:00';
  }
};

/**
 * Get simplified dashboard data (without progress tracking)
 */
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
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
    console.log('🔍 Dashboard filtering - Total purchased courses:', user.purchasedCourses.length);
    user.purchasedCourses.forEach((course, index) => {
      console.log(`   ${index + 1}. "${course.title}" - Status: "${course.status}", Public: ${course.isPublic}`);
    });
    
    const activeCourses = user.purchasedCourses.filter(course => 
      course.status === 'active' && course.isPublic !== false
    );
    
    console.log('🔍 Dashboard filtering - Active courses after filter:', activeCourses.length);
    
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
    console.error('❌ [Progress Dashboard] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};
