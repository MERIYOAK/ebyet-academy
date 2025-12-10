const Course = require('../models/Course');
const CourseVersion = require('../models/CourseVersion');
const Video = require('../models/Video');
const { 
  uploadFileWithOrganization,
  getPublicUrl
} = require('../utils/s3');
const { 
  uploadCourseFile, 
  archiveCourseContent, 
  validateFile,
  getCourseFolderPath,
  getSignedUrlForFile,
  deleteFileFromS3
} = require('../utils/s3CourseManager');

/**
 * Create a new course with versioning
 */
const createCourse = async (req, res) => {
  try {
    const { title, description, price, category, tags, level, isPublic = true, maxEnrollments, hasWhatsappGroup, whatsappGroupLink } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    // Validate required fields
    if (!title || !description || !price || !category || !level) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, description, price, category, and level are required' 
      });
    }

    // Validate category
    const validCategories = ['youtube', 'camera', 'photo', 'video', 'computer', 'english', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category must be one of: youtube, camera, photo, video, computer, english, other' 
      });
    }

    // Validate level
    const validLevels = ['beginner', 'intermediate', 'advanced'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Level must be one of: beginner, intermediate, advanced' 
      });
    }

    // Create the main course record
    const course = new Course({
      title,
      description,
      price: parseFloat(price),
      category,
      level,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()).filter(tag => tag)) : [],
      isPublic,
      maxEnrollments: maxEnrollments ? parseInt(maxEnrollments) : null,
      hasWhatsappGroup: Boolean(hasWhatsappGroup),
      whatsappGroupLink: whatsappGroupLink || '',
      createdBy: adminEmail,
      lastModifiedBy: adminEmail,
      version: 1,
      currentVersion: 1
    });

    await course.save();

    // Create the first version record
    const courseVersion = new CourseVersion({
      courseId: course._id,
      versionNumber: 1,
      title,
      description,
      price: parseFloat(price),
      category,
      level,
      s3FolderPath: getCourseFolderPath(title, 1),
      createdBy: adminEmail,
      changeLog: 'Initial version',
      isPublic
    });

    await courseVersion.save();

    console.log(`✅ Course created: ${course.title} (ID: ${course._id}) by ${adminEmail}`);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: {
        course: {
          id: course._id,
          title: course.title,
          slug: course.slug,
          version: course.version,
          status: course.status
        }
      }
    });

  } catch (error) {
    console.error('❌ Create course error:', error);
    
    // Handle duplicate key error (slug already exists)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
      return res.status(409).json({
        success: false,
        message: 'A course with this title already exists. Please use a different title.',
        error: 'Duplicate course title'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: validationErrors.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create course',
      error: error.message
    });
  }
};

/**
 * Upload thumbnail for a course version
 */
const uploadThumbnail = async (req, res) => {
  try {
    console.log('\n🖼️  Thumbnail upload request received...');
    
    const { courseId } = req.params;
    const { version = 1 } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail file is required'
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    // Validate file
    validateFile(req.file, ['image/jpeg', 'image/png', 'image/webp'], 5 * 1024 * 1024); // 5MB max

    // Get course and version info
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

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

    // Store old thumbnail URLs for potential future use
    const oldCourseThumbnailURL = course.thumbnailURL;
    const oldVersionThumbnailURL = courseVersion.thumbnailURL;
    
    console.log(`📁 Preserving old thumbnails:`);
    // Preserving old thumbnails

    // Upload thumbnail to S3 using the original working approach
    const uploadResult = await uploadFileWithOrganization(req.file, 'thumbnail', {
      courseName: course.title
    });

    // Clean up temporary file if using disk storage
    if (req.file.path) {
      require('fs').unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp thumbnail file:', err);
      });
    }
    
    // Ensure we have a public URL - if uploadResult.publicUrl is null, generate one
    let thumbnailURL = uploadResult.publicUrl;
    if (!thumbnailURL) {
      // If the upload didn't result in a public URL, generate one using the S3 key
      thumbnailURL = getPublicUrl(uploadResult.s3Key);
      // Upload didn't return public URL, generated fallback
    }

    // Update course version with thumbnail URL
    courseVersion.thumbnailURL = thumbnailURL;
    courseVersion.thumbnailS3Key = uploadResult.s3Key; // Keep S3 key for potential future use
    await courseVersion.save();

    // Update main course if this is the current version
    if (course.currentVersion === parseInt(version)) {
      course.thumbnailURL = thumbnailURL;
      course.thumbnailS3Key = uploadResult.s3Key;
      course.lastModifiedBy = adminEmail;
      await course.save();
    }

    console.log(`✅ Thumbnail upload completed for course: ${course.title} v${version} by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: {
        thumbnailURL: thumbnailURL,
        s3Key: uploadResult.s3Key,
        oldThumbnails: {
          course: oldCourseThumbnailURL,
          version: oldVersionThumbnailURL
        }
      }
    });

  } catch (error) {
    console.error('❌ Upload thumbnail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload thumbnail',
      error: error.message
    });
  }
};

/**
 * Upload video for a course version
 */
const uploadVideo = async (req, res) => {
  try {
    const { courseId, version = 1, title, order } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Video file is required'
      });
    }

    // Validate file
    validateFile(req.file, ['video/mp4', 'video/webm', 'video/ogg'], 500 * 1024 * 1024); // 500MB max

    // Get course and version info
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

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

    // Upload video to S3
    const uploadResult = await uploadCourseFile(req.file, 'video', course.title, parseInt(version));

    // Clean up temporary file if using disk storage
    if (req.file.path) {
      require('fs').unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }

    // Create video record
    const video = new Video({
      title: title || req.file.originalname,
      s3Key: uploadResult.s3Key,
      courseId,
      courseVersion: parseInt(version),
      order: order ? parseInt(order) : 0,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      uploadedBy: adminEmail
    });

    await video.save();

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

    console.log(`✅ Video uploaded for course: ${course.title} v${version} by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        video: {
          id: video._id,
          title: video.title,
          s3Key: video.s3Key,
          order: video.order
        }
      }
    });

  } catch (error) {
    console.error('❌ Upload video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: error.message
    });
  }
};

/**
 * Create a new version of an existing course
 */
const createNewVersion = async (req, res) => {
  try {
    const { courseId, changeLog } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get the latest version
    const latestVersion = await CourseVersion.findOne({ 
      courseId 
    }).sort({ versionNumber: -1 });

    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Create new version record
    const newVersion = new CourseVersion({
      courseId,
      versionNumber: newVersionNumber,
      title: course.title,
      description: course.description,
      price: course.price,
      s3FolderPath: getCourseFolderPath(course.title, newVersionNumber),
      createdBy: adminEmail,
      changeLog: changeLog || `Version ${newVersionNumber} created`
    });

    await newVersion.save();

    // Update main course
    course.version = newVersionNumber;
    course.currentVersion = newVersionNumber;
    course.lastModifiedBy = adminEmail;
    await course.save();

    console.log(`✅ New version created for course: ${course.title} v${newVersionNumber} by ${adminEmail}`);

    res.json({
      success: true,
      message: 'New course version created successfully',
      data: {
        courseId: course._id,
        newVersion: newVersionNumber,
        s3FolderPath: newVersion.s3FolderPath
      }
    });

  } catch (error) {
    console.error('❌ Create new version error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create new version',
      error: error.message
    });
  }
};

/**
 * Update course metadata
 */
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, category, tags, level, status, isPublic, maxEnrollments, hasWhatsappGroup, whatsappGroupLink } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Update main course
    if (title) course.title = title;
    if (description) course.description = description;
    if (price) course.price = parseFloat(price);
    if (category) {
      const validCategories = ['youtube', 'camera', 'photo', 'video', 'computer', 'english', 'other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Category must be one of: youtube, camera, photo, video, computer, english, other'
        });
      }
      course.category = category;
    }
    if (level) {
      const validLevels = ['beginner', 'intermediate', 'advanced'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({
          success: false,
          message: 'Level must be one of: beginner, intermediate, advanced'
        });
      }
      course.level = level;
    }
    if (tags) {
      // Handle tags whether they come as array or string
      if (Array.isArray(tags)) {
        course.tags = tags;
      } else if (typeof tags === 'string') {
        course.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }
    if (status && ['active', 'inactive', 'archived'].includes(status)) {
      course.status = status;
    }
    if (typeof isPublic === 'boolean') course.isPublic = isPublic;
    if (maxEnrollments !== undefined) course.maxEnrollments = maxEnrollments ? parseInt(maxEnrollments) : null;
    
    // Handle WhatsApp group fields
    if (typeof hasWhatsappGroup === 'boolean') {
      course.hasWhatsappGroup = hasWhatsappGroup;
    }
    if (whatsappGroupLink !== undefined) {
      course.whatsappGroupLink = whatsappGroupLink;
    }

    course.lastModifiedBy = adminEmail;
    await course.save();

    // Update current version if it exists
    const currentVersion = await CourseVersion.findOne({ 
      courseId: id, 
      versionNumber: course.currentVersion 
    });

    if (currentVersion) {
      if (title) currentVersion.title = title;
      if (description) currentVersion.description = description;
      if (price) currentVersion.price = parseFloat(price);
      if (level) currentVersion.level = level;
      if (typeof isPublic === 'boolean') currentVersion.isPublic = isPublic;
      await currentVersion.save();
    }

    console.log(`✅ Course updated: ${course.title} by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: {
        course: {
          id: course._id,
          title: course.title,
          status: course.status,
          currentVersion: course.currentVersion
        }
      }
    });

  } catch (error) {
    console.error('❌ Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course',
      error: error.message
    });
  }
};

/**
 * Soft delete (archive) a course
 */
const archiveCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { reason, gracePeriodMonths = 6 } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Archive the course
    await course.archive(reason || 'Admin request', gracePeriodMonths);

    // Archive all versions
    const versions = await CourseVersion.find({ courseId });
    for (const version of versions) {
      await version.archive(reason || 'Admin request');
      
      // Archive S3 content for this version
      try {
        await archiveCourseContent(course.title, version.versionNumber);
        console.log(`✅ S3 content archived for course: ${course.title} v${version.versionNumber}`);
      } catch (s3Error) {
        console.error(`❌ Failed to archive S3 content for course: ${course.title} v${version.versionNumber}`, s3Error);
      }
    }

    console.log(`✅ Course archived: ${course.title} by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Course archived successfully',
      data: {
        courseId: course._id,
        archivedAt: course.archivedAt,
        archiveReason: course.archiveReason,
        gracePeriod: course.archiveGracePeriod
      }
    });

  } catch (error) {
    console.error('❌ Archive course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive course',
      error: error.message
    });
  }
};

/**
 * Unarchive a course
 */
const unarchiveCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.status !== 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Course is not archived'
      });
    }

    // Unarchive the course
    await course.unarchive();

    // Unarchive all versions
    const versions = await CourseVersion.find({ courseId, status: 'archived' });
    for (const version of versions) {
      await version.unarchive();
    }

    console.log(`✅ Course unarchived: ${course.title} by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Course unarchived successfully',
      data: {
        courseId: course._id,
        status: course.status
      }
    });

  } catch (error) {
    console.error('❌ Unarchive course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unarchive course',
      error: error.message
    });
  }
};

/**
 * Delete course permanently (admin only)
 */
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    console.log(`🗑️ Delete course request for ID: ${id} by ${adminEmail}`);

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

    console.log(`📋 Found course: "${course.title}" (ID: ${course._id})`);

    // Get all course versions for this course
    const courseVersions = await CourseVersion.find({ courseId: id });
    console.log(`📚 Found ${courseVersions.length} course versions to delete`);

    // Delete all videos associated with this course
    const videos = await Video.find({ courseId: id });
    console.log(`🎥 Found ${videos.length} videos to delete`);

    // Delete files from S3
    const s3DeletionPromises = [];

    // Delete thumbnail from S3
    if (course.thumbnailS3Key) {
      // Deleting thumbnail from S3
      s3DeletionPromises.push(
        deleteFileFromS3(course.thumbnailS3Key).catch(error => {
          console.warn(`⚠️ Failed to delete thumbnail from S3: ${error.message}`);
        })
      );
    }

    // Delete all video files from S3
    for (const video of videos) {
      if (video.s3Key) {
        // Deleting video from S3
        s3DeletionPromises.push(
          deleteFileFromS3(video.s3Key).catch(error => {
            console.warn(`⚠️ Failed to delete video from S3: ${error.message}`);
          })
        );
      }
    }

    // Wait for all S3 deletions to complete
    await Promise.all(s3DeletionPromises);
    console.log(`✅ S3 deletion completed`);

    // Delete all videos from database
    if (videos.length > 0) {
      await Video.deleteMany({ courseId: id });
      console.log(`✅ Deleted ${videos.length} videos from database`);
    }

    // Delete all course versions from database
    if (courseVersions.length > 0) {
      await CourseVersion.deleteMany({ courseId: id });
      console.log(`✅ Deleted ${courseVersions.length} course versions from database`);
    }

    // Delete the main course
    await Course.findByIdAndDelete(id);
    console.log(`✅ Deleted course "${course.title}" from database`);

    console.log(`🎉 Course deletion completed successfully by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Course deleted successfully',
      data: {
        courseId: id,
        courseTitle: course.title,
        deletedVideos: videos.length,
        deletedVersions: courseVersions.length
      }
    });

  } catch (error) {
    console.error('❌ Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete course',
      error: error.message
    });
  }
};

/**
 * Get all courses (filtered for logged-in users to exclude purchased courses)
 */
const getAllCourses = async (req, res) => {
  try {
    console.log('🔍 getAllCourses called with query:', req.query);
    
    const { status, category, search, level, tag, priceRange, limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    
    // Filter by status
    if (status && status === 'all') {
      // Admin wants to see all courses regardless of status
      // Don't add any status filter
    } else if (status && ['active', 'inactive', 'archived'].includes(status)) {
      query.status = status;
    } else {
      // Default to active courses for public access
      query.status = 'active';
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by level
    if (level) {
      query.level = level;
    }

    // Filter by tag
    if (tag) {
      query.tags = { $in: [tag] };
    }

    // Filter by price range
    if (priceRange) {
      switch (priceRange) {
        case 'free':
          query.price = 0;
          break;
        case 'under-50':
          query.price = { $gt: 0, $lt: 50 };
          break;
        case '50-100':
          query.price = { $gte: 50, $lte: 100 };
          break;
        case 'over-100':
          query.price = { $gt: 100 };
          break;
      }
    }

    // Filter by search term
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    console.log('📊 Database query:', JSON.stringify(query, null, 2));

    const courses = await Course.find(query)
      .populate('videos')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`📚 Found ${courses.length} courses from database`);

    // Filter out purchased courses for logged-in users
    let filteredCourses = courses;
    
    // Check for authentication token in headers
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded && decoded.userId) {
          console.log('🔍 User is logged in, filtering out purchased courses');
          console.log('🔍 User ID:', decoded.userId);
          
          // Get user's purchased courses
          const User = require('../models/User');
          const user = await User.findById(decoded.userId);
          
          if (user && user.purchasedCourses && user.purchasedCourses.length > 0) {
            const purchasedCourseIds = user.purchasedCourses.map(id => id.toString());
            console.log('🔍 User has purchased courses:', purchasedCourseIds);
            
            filteredCourses = courses.filter(course => 
              !purchasedCourseIds.includes(course._id.toString())
            );
            
            console.log(`📚 Filtered from ${courses.length} to ${filteredCourses.length} courses`);
          } else {
            console.log('🔍 User has no purchased courses');
          }
        }
      } catch (error) {
        console.log('🔍 Invalid token, showing all courses');
      }
    } else {
      console.log('🔍 No authentication token, showing all courses');
    }

    // Ensure all courses have proper public thumbnail URLs
    const coursesWithFixedThumbnails = filteredCourses.map(course => {
      console.log(`🔍 Course: "${course.title}"`);
      // Processing course thumbnail
      
      if (course.thumbnailS3Key && (!course.thumbnailURL || !course.thumbnailURL.includes('s3.amazonaws.com'))) {
        // Generate public URL from S3 key
        course.thumbnailURL = getPublicUrl(course.thumbnailS3Key);
        // Fixed thumbnail URL for course
      }
      
      // Final thumbnail URL processed
      return course;
    });

    const total = await Course.countDocuments(query);
    console.log(`📊 Total courses in database: ${total}`);

    res.json({
      success: true,
      data: {
        courses: coursesWithFixedThumbnails,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get all courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error: error.message
    });
  }
};

/**
 * Get user's purchased courses
 */
const getUserPurchasedCourses = async (req, res) => {
  try {
    console.log('🔍 getUserPurchasedCourses called');
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get user's purchased course IDs
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.purchasedCourses || user.purchasedCourses.length === 0) {
      return res.json({
        success: true,
        data: {
          courses: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        }
      });
    }

    console.log(`🔍 User has ${user.purchasedCourses.length} purchased courses`);

    // Get purchased courses with pagination
    const purchasedCourses = await Course.find({
      _id: { $in: user.purchasedCourses },
      status: 'active'
    })
    .populate('videos')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    console.log(`📚 Found ${purchasedCourses.length} purchased courses from database`);

    // Ensure all courses have proper public thumbnail URLs
    const coursesWithFixedThumbnails = purchasedCourses.map(course => {
      console.log(`🔍 Purchased Course: "${course.title}"`);
      // Processing course thumbnail
      
      if (course.thumbnailS3Key && (!course.thumbnailURL || !course.thumbnailURL.includes('s3.amazonaws.com'))) {
        // Generate public URL from S3 key
        course.thumbnailURL = getPublicUrl(course.thumbnailS3Key);
        // Fixed thumbnail URL for course
      }
      
      // Final thumbnail URL processed
      return course;
    });

    const total = await Course.countDocuments({
      _id: { $in: user.purchasedCourses },
      status: 'active'
    });

    console.log(`📊 Total purchased courses: ${total}`);

    res.json({
      success: true,
      data: {
        courses: coursesWithFixedThumbnails,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get user purchased courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchased courses',
      error: error.message
    });
  }
};

/**
 * Get course by ID with version information
 */
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.query;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get version information
    let courseVersion;
    if (version) {
      courseVersion = await CourseVersion.findOne({ 
        courseId: id, 
        versionNumber: parseInt(version) 
      }).populate('videos');
    } else {
      courseVersion = await CourseVersion.findOne({ 
        courseId: id, 
        versionNumber: course.currentVersion 
      }).populate('videos');
    }

    if (!courseVersion) {
      return res.status(404).json({
        success: false,
        message: 'Course version not found'
      });
    }

    // Get all versions for this course
    const allVersions = await CourseVersion.find({ courseId: id })
      .select('versionNumber title changeLog createdAt status')
      .sort({ versionNumber: -1 });

    // Populate the course's videos array with the current version's videos
    const courseData = course.toObject();
    courseData.videos = courseVersion.videos || [];
    
    console.log('📹 Course videos data:', {
      courseId: id,
      videoCount: courseData.videos.length,
      videos: courseData.videos.map(v => ({ 
        id: v._id, 
        title: v.title, 
        duration: v.duration,
        status: v.status 
      }))
    });
    
    // Debug duration values in detail
    console.log('⏱️ Duration debugging (backend):');
    courseData.videos.forEach((video, index) => {
      console.log(`  Video ${index + 1}: "${video.title}"`);
      console.log(`    Duration: "${video.duration}" (type: ${typeof video.duration})`);
      console.log(`    Raw duration value:`, video.duration);
    });

    res.json({
      success: true,
      data: {
        course: courseData,
        currentVersion: courseVersion,
        versions: allVersions
      }
    });

  } catch (error) {
    console.error('❌ Get course by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course',
      error: error.message
    });
  }
};

/**
 * Enroll a student in a course
 */
const enrollStudent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Course is not available for enrollment'
      });
    }

    await course.enrollStudent(userId);

    console.log(`✅ Student enrolled: User ${userId} in course ${course.title}`);

    res.json({
      success: true,
      message: 'Successfully enrolled in course',
      data: {
        courseId: course._id,
        courseTitle: course.title,
        versionEnrolled: course.currentVersion
      }
    });

  } catch (error) {
    console.error('❌ Enroll student error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to enroll in course',
      error: error.message
    });
  }
};

/**
 * Update student progress
 */
const updateStudentProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { progress, completedVideos } = req.body;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    await course.updateStudentProgress(userId, progress, completedVideos);

    res.json({
      success: true,
      message: 'Progress updated successfully'
    });

  } catch (error) {
    console.error('❌ Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update progress',
      error: error.message
    });
  }
};

module.exports = {
  createCourse,
  uploadThumbnail,
  uploadVideo,
  createNewVersion,
  updateCourse,
  archiveCourse,
  unarchiveCourse,
  deleteCourse,
  getAllCourses,
  getUserPurchasedCourses,
  getCourseById,
  enrollStudent,
  updateStudentProgress
}; 