const Course = require('../models/Course');
const Video = require('../models/Video');

const getDeletionSummary = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate course ID
    if (!id || !require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Find the course
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get all videos for this course
    const videos = await Video.find({ courseId: id });

    // Return deletion summary
    res.json({
      success: true,
      message: 'Deletion summary retrieved successfully',
      data: {
        course: {
          id: course._id,
          title: course.title,
          videoCount: videos.length,
          materialCount: 0
        },
        videos: videos.map(video => ({
          id: video._id,
          title: video.title,
          s3Key: video.s3Key,
          fileSize: video.fileSize
        }))
      }
    });
  } catch (error) {
    console.error('Get deletion summary error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get deletion summary', 
      error: error.message 
    });
  }
};

module.exports = getDeletionSummary;
