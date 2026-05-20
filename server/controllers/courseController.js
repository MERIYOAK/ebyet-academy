const mongoose = require('mongoose');
const Course = require('../models/Course');
const Video = require('../models/Video');
const GroupAccessToken = require('../models/GroupAccessToken');
const Payment = require('../models/Payment');
const { uploadToS3, deleteFromS3, deleteFileFromS3 } = require('../utils/s3');
const { uploadCourseFile, getPublicUrl } = require('../utils/s3CourseManager');
const { getThumbnailPublicUrl } = require('../utils/s3Enhanced');

// Get socket service from app
const getSocketService = (req) => {
  return req.app.get('socketService');
};

// Helper function to ensure thumbnail is publicly accessible
const ensureThumbnailPublic = async (course) => {
  if (!course.thumbnailURL) return course;
  if (!course.thumbnailURL.includes('s3.amazonaws.com')) {
    const publicUrl = getThumbnailPublicUrl(course.thumbnailURL);
    if (publicUrl) {
      course.thumbnailURL = publicUrl;
      await course.save();
    }
  }
  return course;
};

exports.getCourses = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const isAuthenticated = !!userId;

    const allCourses = await Course.find().populate('videos');

    let purchasedCourseIds = [];
    if (isAuthenticated) {
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (user && user.purchasedCourses && user.purchasedCourses.length > 0) {
        purchasedCourseIds = user.purchasedCourses.map(id => id.toString());
      }
    }

    const coursesWithPublicThumbnails = await Promise.all(
      allCourses.map(async (course) => {
        const processedCourse = await ensureThumbnailPublic(course);
        const courseObj = processedCourse.toObject ? processedCourse.toObject() : processedCourse;
        courseObj.isPurchased = purchasedCourseIds.includes(course._id.toString());
        return courseObj;
      })
    );

    res.json(coursesWithPublicThumbnails);
  } catch (error) {
    console.error('❌ [getCourses] Error:', error);
    res.status(500).json({ message: 'Failed to fetch courses', error: error.message });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('videos');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    
    // Ensure thumbnail is publicly accessible
    await ensureThumbnailPublic(course);
    
    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Failed to fetch course', error: error.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { title, description, thumbnailURL, price, videos } = req.body;
    const course = await Course.create({ title, description, thumbnailURL, price, videos });
    res.status(201).json(course);
  } catch (err) {
    res.status(400).json({ message: 'Create failed', error: err.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    // Optionally delete related videos
    await Video.deleteMany({ courseId: course._id });
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Delete failed', error: err.message });
  }
};

exports.uploadThumbnail = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    // Get course details for folder organization
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    
    // Upload with versioned path structure (use currentVersion or default to 1)
    const version = course.currentVersion || 1;
    const uploadResult = await uploadCourseFile(req.file, 'thumbnail', course.title, version);
    
    const publicUrl = getPublicUrl(uploadResult.s3Key);
    const updatedCourse = await Course.findByIdAndUpdate(courseId, { thumbnailURL: publicUrl }, { new: true });
    
    res.status(201).json({ thumbnailURL: publicUrl, course: updatedCourse });
  } catch (err) {
    console.error('Thumbnail upload failed:', err?.message || err);
    res.status(500).json({ message: 'Thumbnail upload failed', error: err.message });
  }
};

exports.deleteThumbnail = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course || !course.thumbnailURL) return res.status(404).json({ message: 'Thumbnail not found' });
    
    // Extract S3 key from public URL
    const s3Key = course.thumbnailURL.split('.amazonaws.com/')[1];
    await deleteFileFromS3(s3Key);
    
    course.thumbnailURL = '';
    await course.save();
    res.json({ message: 'Thumbnail deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Thumbnail delete failed', error: err.message });
  }
};

exports.updateThumbnail = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    // Store the old thumbnail URL for potential future use
    const oldThumbnailURL = course.thumbnailURL;
    const oldS3Key = oldThumbnailURL ? oldThumbnailURL.split('.amazonaws.com/')[1] : null;
    
    
    // Upload new thumbnail with versioned path structure (use currentVersion or default to 1)
    const version = course.currentVersion || 1;
    const uploadResult = await uploadCourseFile(req.file, 'thumbnail', course.title, version);
    
    const publicUrl = getPublicUrl(uploadResult.s3Key);
    course.thumbnailURL = publicUrl;
    await course.save();
    
    
    res.json({ 
      thumbnailURL: publicUrl, 
      course,
      oldThumbnailURL: oldThumbnailURL // Return old URL for potential future use
    });
  } catch (err) {
    console.error('Thumbnail update failed:', err?.message || err);
    res.status(500).json({ message: 'Thumbnail update failed', error: err.message });
  }
};

// Generate WhatsApp group access token for enrolled users
const generateGroupToken = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    // Validate userId
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate courseId format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID format' });
    }

    // Check if course exists and has a WhatsApp group
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.hasWhatsappGroup || !course.whatsappGroupLink) {
      return res.status(404).json({ message: 'This course does not have a WhatsApp group' });
    }

    // Check if user has purchased the course (check purchasedCourses array)
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }


    // Check if course is in user's purchasedCourses array
    // Handle both ObjectId and string comparisons
    const courseIdString = courseId.toString();
    const hasPurchased = user.purchasedCourses && user.purchasedCourses.some(purchasedId => {
      const purchasedIdString = purchasedId.toString();
      return purchasedIdString === courseIdString || 
             purchasedIdString === courseId || 
             purchasedId === courseIdString ||
             purchasedId === courseId;
    });

    if (!hasPurchased) {
      const enrollment = course.getStudentEnrollment(userId);
      if (enrollment) {
        // enrolled — grant access
      } else {
        // Not enrolled and not in purchasedCourses - deny access
        return res.status(403).json({ message: 'You must purchase this course to access the WhatsApp group' });
      }
    }

    // Generate temporary WhatsApp group link (expires in 5 minutes)
    const tempLinkData = await GroupAccessToken.generateTemporaryGroupLink(courseId, userId);
    
    
    res.json({
      success: true,
      temporaryLink: tempLinkData.temporaryLink,
      expiresAt: tempLinkData.expiresAt,
      tempToken: tempLinkData.tempToken,
      joinUrl: `/api/courses/${courseId}/join?token=${tempLinkData.tempToken}`
    });

  } catch (error) {
    console.error('Error generating group token:', error);
    res.status(500).json({ message: 'Failed to generate group access token', error: error.message });
  }
};

// Join WhatsApp group with token validation
const joinGroup = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { token } = req.query || {};

    if (!token) {
      return res.status(400).json({ message: 'Access token is required' });
    }

    // Validate and consume the token
    const validation = await GroupAccessToken.validateAndConsume(
      token, 
      req.ip, 
      req.get('User-Agent')
    );


    if (!validation.valid) {
      return res.status(403).json({ 
        message: 'Invalid or expired access token',
        error: validation.error 
      });
    }

    // Verify the course ID matches (handle both ObjectId and string)
    const validationCourseId = validation.courseId._id ? validation.courseId._id.toString() : validation.courseId.toString();
    if (validationCourseId !== courseId) {
      return res.status(403).json({ message: 'Token is not valid for this course' });
    }

    // Get the course to retrieve WhatsApp group link
    const course = await Course.findById(courseId);
    if (!course || !course.whatsappGroupLink) {
      return res.status(404).json({ message: 'WhatsApp group not found for this course' });
    }

    // For temporary links, immediately expire the token after use
    const tokenDoc = await GroupAccessToken.findOne({ token });
    if (tokenDoc && tokenDoc.isTemporaryLink) {
      // Mark as used and set immediate expiration
      tokenDoc.used = true;
      tokenDoc.usedAt = new Date();
      tokenDoc.expiresAt = new Date(); // Immediate expiration
      await tokenDoc.save();
    }

    // Redirect to WhatsApp group (without the temporary token)
    res.redirect(course.whatsappGroupLink);

  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ message: 'Failed to join WhatsApp group', error: error.message });
  }
};

// Import the enhanced course controller functions
const enhancedController = require('./courseControllerEnhanced');

// Basic course functions (using enhanced controller)
const getCourses = enhancedController.getAllCourses;
const getCourse = enhancedController.getCourseById;
const createCourse = enhancedController.createCourse;
const updateCourse = enhancedController.updateCourse;
const deleteCourse = enhancedController.deleteCourse;
const uploadThumbnail = enhancedController.uploadThumbnail;

// Thumbnail functions (basic implementations)
const deleteThumbnail = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Clear thumbnail fields
    course.thumbnailURL = null;
    course.thumbnailS3Key = null;
    await course.save();

    res.json({ message: 'Thumbnail deleted successfully' });
  } catch (error) {
    console.error('Thumbnail delete failed:', error);
    res.status(500).json({ message: 'Thumbnail delete failed', error: error.message });
  }
};

const updateThumbnail = async (req, res) => {
  try {
    // For now, just use the upload thumbnail function
    // This could be enhanced to handle updates specifically
    return uploadThumbnail(req, res);
  } catch (error) {
    console.error('Thumbnail update failed:', error);
    res.status(500).json({ message: 'Thumbnail update failed', error: error.message });
  }
};

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  uploadThumbnail,
  deleteThumbnail,
  updateThumbnail,
  generateGroupToken,
  joinGroup
}; 