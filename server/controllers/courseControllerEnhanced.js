const Course = require('../models/Course');
const Video = require('../models/Video');
const Material = require('../models/Material');
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
  deleteFileFromS3,
  getThumbnailUrl
} = require('../utils/s3CourseManager');

// Get socket service from app
const getSocketService = (req) => {
  return req.app.get('socketService');
};

const attachFreshThumbnailUrl = async (course) => {
  if (!course) return course;

  const rawCourse = course.toObject ? course.toObject() : { ...course };
  if (!rawCourse.thumbnailS3Key) {
    return rawCourse;
  }

  try {
    const freshUrl = await getThumbnailUrl(rawCourse.thumbnailS3Key);
    if (freshUrl) {
      rawCourse.thumbnailURL = freshUrl;
    }
  } catch (error) {
    console.error('❌ Failed to refresh thumbnail URL:', error?.message || error);
  }

  return rawCourse;
};

/**
 * Create a new course without versioning
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
    const validCategories = ['crypto', 'investing', 'trading', 'stock-market', 'etf', 'option-trading', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category must be one of: crypto, investing, trading, stock-market, etf, option-trading, other' 
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

    // Create course without versioning - initially inactive until all content uploaded
    const course = new Course({
      title,
      description,
      price: parseFloat(price),
      category,
      tags: tags ? (Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : [])) : [],
      level,
      isPublic: false, // Force private initially - will be made public after video uploads
      intendedPublic: isPublic, // Store original intent
      uploadComplete: false, // Track when all content is uploaded
      status: 'inactive', // Course is inactive during upload process
      maxEnrollments: maxEnrollments ? parseInt(maxEnrollments) : undefined,
      hasWhatsappGroup: hasWhatsappGroup || false,
      whatsappGroupLink: whatsappGroupLink || '',
      createdBy: adminEmail,
      lastModifiedBy: adminEmail
    });

    await course.save();

    const socketService = getSocketService(req);
    if (socketService) {
      socketService.notifyNewCourse({
        id: course._id,
        title: course.title,
        category: course.category,
        status: course.status
      });
    }

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: {
        courseId: course._id,
        title: course.title,
        slug: course.slug,
        status: course.status
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
 * Upload thumbnail for a course without versioning
 */
const uploadThumbnail = async (req, res) => {
  try {
    const { courseId } = req.params;
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

    // Get course info
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Store old thumbnail URL for potential future use
    const oldCourseThumbnailURL = course.thumbnailURL;
    
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
    
    // Generate presigned URL for thumbnail (works without public access)
    let thumbnailURL;
    try {
      thumbnailURL = await getThumbnailUrl(uploadResult.s3Key);
    } catch (error) {
      console.error('Error generating presigned URL for thumbnail:', error);
      thumbnailURL = uploadResult.publicUrl || getPublicUrl(uploadResult.s3Key);
    }

    // Update course with thumbnail URL
    course.thumbnailURL = thumbnailURL;
    course.thumbnailS3Key = uploadResult.s3Key;
    course.lastModifiedBy = adminEmail;
    await course.save();


    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: {
        thumbnailURL: thumbnailURL,
        s3Key: uploadResult.s3Key,
        oldThumbnailURL: oldCourseThumbnailURL
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
 * Upload video for a course without versioning
 */
const uploadVideo = async (req, res) => {
  try {
    const { courseId, title, order } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Video file is required'
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    // Get course info
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Upload video to S3 without versioning
    const uploadResult = await uploadCourseFile(req.file, 'video', course.title);

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
      order: order ? parseInt(order) : 0,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      uploadedBy: adminEmail
    });

    await video.save();

    // Add video to course
    course.videos.push(video._id);
    course.lastModifiedBy = adminEmail;
    await course.save();


    // Don't emit Socket.IO event yet - course is still private until all content uploaded
    // Event will be emitted when admin marks course as complete

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        videoId: video._id,
        s3Key: uploadResult.s3Key,
        publicUrl: uploadResult.publicUrl
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
 * Mark course as complete and make it public
 */
const markCourseComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Make course active and public if intended
    if (course.intendedPublic && (!course.isPublic || course.status !== 'active')) {
      course.isPublic = true;
      course.status = 'active'; // Set course to active status
      course.uploadComplete = true;
      course.lastModifiedBy = adminEmail;
      await course.save();


      // Emit Socket.IO event for real-time update
      const socketService = getSocketService(req);
      if (socketService) {
        socketService.notifyCourseUpdate({
          id: course._id,
          title: course.title,
          description: course.description,
          category: course.category,
          level: course.level,
          price: course.price,
          thumbnail: course.thumbnail,
          isPublic: course.isPublic,
          status: course.status
        });
      }

      res.json({
        success: true,
        message: 'Course marked as complete and made active',
        data: {
          courseId: course._id,
          isPublic: course.isPublic,
          status: course.status,
          uploadComplete: course.uploadComplete
        }
      });
    } else {
      res.json({
        success: true,
        message: 'Course already marked as complete and active',
        data: {
          courseId: course._id,
          isPublic: course.isPublic,
          status: course.status,
          uploadComplete: course.uploadComplete
        }
      });
    }
  } catch (error) {
    console.error('❌ Mark course complete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark course as complete',
      error: error.message
    });
  }
};
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    let { title, description, price, category, tags, level, status, isPublic, maxEnrollments, hasWhatsappGroup, whatsappGroupLink, featured } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    // Parse bilingual title and description if they come as JSON strings
    try {
      if (title && typeof title === 'string' && title.startsWith('{')) {
        title = JSON.parse(title);
      }
      if (description && typeof description === 'string' && description.startsWith('{')) {
        description = JSON.parse(description);
      }
    } catch (e) {
      // If parsing fails, treat as regular string (backward compatibility)
    }

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
      const validCategories = ['crypto', 'investing', 'trading', 'stock-market', 'etf', 'option-trading', 'other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Category must be one of: crypto, investing, trading, stock-market, etf, option-trading, other'
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
      // Automatically set isPublic to true when status is set to active
      if (status === 'active') {
        course.isPublic = true;
      }
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
    
    // Emit Socket.IO event for WhatsApp group update if changed
    const socketServiceWhatsapp = getSocketService(req);
    if (socketServiceWhatsapp && (hasWhatsappGroup !== undefined || whatsappGroupLink !== undefined)) {
      socketServiceWhatsapp.notifyWhatsappGroupUpdated({
        id: course._id,
        title: course.title,
        hasWhatsappGroup: course.hasWhatsappGroup,
        whatsappGroupLink: course.whatsappGroupLink
      });
    }
    
    if (typeof featured === 'boolean') {
      course.featured = featured;
    }

    course.lastModifiedBy = adminEmail;
    await course.save();

    // Emit Socket.IO event for real-time update
    const socketServiceUpdate = getSocketService(req);
    if (socketServiceUpdate) {
      socketServiceUpdate.notifyCourseUpdate({
        id: course._id,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        price: course.price,
        thumbnail: course.thumbnail,
        isPublic: course.isPublic,
        status: course.status
      });
      
    }

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: {
        course: {
          id: course._id,
          title: course.title,
          status: course.status
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
 * Deactivate course (removes from public listings, enrolled students keep access)
 */
const deactivateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { reason } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Deactivate the course
    await course.deactivate(reason || 'Admin request');


    res.json({
      success: true,
      message: 'Course deactivated successfully',
      data: {
        course: {
          id: course._id,
          title: course.title,
          status: course.status,
          deactivatedAt: course.deactivatedAt,
          archiveGracePeriod: course.archiveGracePeriod
        }
      }
    });
  } catch (error) {
    console.error('❌ Deactivate course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate course',
      error: error.message
    });
  }
};

/**
 * Reactivate course (makes it visible in public listings again)
 */
const reactivateCourse = async (req, res) => {
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

    if (course.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Course is already active'
      });
    }

    // Reactivate the course
    await course.reactivate();


    res.json({
      success: true,
      message: 'Course reactivated successfully',
      data: {
        course: {
          id: course._id,
          title: course.title,
          status: course.status
        }
      }
    });
  } catch (error) {
    console.error('❌ Reactivate course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate course',
      error: error.message
    });
  }
};

/**
 * Get deletion summary for a course (before deletion)
 * Returns what will be deleted without actually deleting
 */
const getDeletionSummary = require('./getDeletionSummary');

/**
 * Delete a course and all its content
 */
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

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

    // Get all videos and materials for deletion
    const videos = await Video.find({ courseId: id });
    const materials = await Material.find({ courseId: id });

    // Delete all videos from S3
    for (const video of videos) {
      if (video.s3Key) {
        try {
          await deleteFileFromS3(video.s3Key);
        } catch (s3Error) {
          console.error(`Failed to delete video from S3: ${video.s3Key}`, s3Error);
        }
      }
      await Video.findByIdAndDelete(video._id);
    }

    // Delete all materials from S3
    for (const material of materials) {
      if (material.s3Key) {
        try {
          await deleteFileFromS3(material.s3Key);
        } catch (s3Error) {
          console.error(`Failed to delete material from S3: ${material.s3Key}`, s3Error);
        }
      }
      await Material.findByIdAndDelete(material._id);
    }

    // Delete course thumbnail from S3
    if (course.thumbnailS3Key) {
      try {
        await deleteFileFromS3(course.thumbnailS3Key);
      } catch (s3Error) {
        console.error(`Failed to delete thumbnail from S3: ${course.thumbnailS3Key}`, s3Error);
      }
    }

    // Delete course from database
    await Course.findByIdAndDelete(id);

    const socketService = getSocketService(req);
    if (socketService) {
      socketService.broadcastContentUpdate('COURSE_DELETED', { id, courseId: id });
    }

    res.json({
      success: true,
      message: 'Course deleted successfully',
      data: {
        deletedVideos: videos.length,
        deletedMaterials: materials.length,
        deletedThumbnail: !!course.thumbnailS3Key
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
 * Get all courses with pagination and filtering
 */
const getAllCourses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      level, 
      search, 
      featured,
      isPublic,
      includeInactive,
      status,
      sortBy,
      sortOrder
    } = req.query;

    // Set defaults for sortBy and sortOrder if not provided
    const finalSortBy = sortBy || 'createdAt';
    const finalSortOrder = sortOrder || 'desc';

    // Build filter object
    const filter = {};
    
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (featured === 'true') filter.featured = true;
    if (isPublic !== undefined) filter.isPublic = isPublic === 'true';
    
    // Handle status filtering
    if (status && status !== 'all') {
      filter.status = status;
    } else if (!(status === 'all' && includeInactive === 'true')) {
      if (!includeInactive || includeInactive !== 'true') {
        filter.status = 'active';
      }
    }

    // Search functionality
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { 'title.en': { $regex: search, $options: 'i' } },
          { 'title.tg': { $regex: search, $options: 'i' } },
          { 'description.en': { $regex: search, $options: 'i' } },
          { 'description.tg': { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build the final query object properly
    let finalQuery = {};
    
    // If there's a search query, combine it with the status filter
    if (search && Object.keys(searchQuery).length > 0) {
      finalQuery = {
        ...filter,
        ...searchQuery
      };
    } else {
      finalQuery = filter;
    }
    
    // Build sort object
    const sort = {};
    if (finalSortBy) {
      sort[finalSortBy] = finalSortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    
    const courses = await Course.find(finalQuery)
      .select('-__v')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('videos', 'title s3Key order fileSize duration')
      .lean();


    // Get total count for pagination
    const total = await Course.countDocuments(finalQuery);

    // Determine which courses are purchased for the authenticated user
    let purchasedCourseIds = [];
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded && decoded.userId) {
          const User = require('../models/User');
          const user = await User.findById(decoded.userId);

          if (user && Array.isArray(user.purchasedCourses) && user.purchasedCourses.length > 0) {
            purchasedCourseIds = user.purchasedCourses.map(id => id.toString());
          }
        }
      } catch (error) {
        // Invalid token - treat as public user (no purchased courses)
      }
    }

    // Attach fresh thumbnail URLs and purchase status
    const coursesWithPurchaseStatus = await Promise.all(
      courses.map(async (course) => {
        const courseWithFreshThumbnail = await attachFreshThumbnailUrl(course);
        return {
          ...courseWithFreshThumbnail,
          isPurchased: purchasedCourseIds.includes(course._id.toString())
        };
      })
    );

    res.json({
      success: true,
      data: {
        courses: coursesWithPurchaseStatus,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalCourses: total,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('❌ Get all courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get courses',
      error: error.message
    });
  }
};

/**
 * Get a single course by ID
 */
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate course ID
    if (!id || !require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Find course with populated videos
    const course = await Course.findById(id)
      .populate('videos', 'title s3Key order fileSize duration originalName description isFreePreview');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is public and active - only allow access to public active courses for regular users
    // But allow admins to access any course for editing (including inactive ones)
    const isAdmin = req.admin || (req.user && req.user.role === 'admin');
    
    const courseWithFreshThumbnail = await attachFreshThumbnailUrl(course);

    if (course.isPublic && course.status === 'active') {
      return res.json({
        success: true,
        data: {
          course: courseWithFreshThumbnail
        }
      });
    }
    
    if (isAdmin) {
      return res.json({
        success: true,
        data: {
          course: courseWithFreshThumbnail
        }
      });
    }
    
    if (req.user && req.user.role === 'admin') {
      return res.json({
        success: true,
        data: {
          course: courseWithFreshThumbnail
        }
      });
    }
    
    if (!course.isPublic || course.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Course not available'
      });
    }
  } catch (error) {
    console.error('❌ Get course by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get course',
      error: error.message
    });
  }
};

/**
 * Generate WhatsApp group access token
 */
const generateGroupToken = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.hasWhatsappGroup || !course.whatsappGroupLink) {
      return res.status(400).json({
        success: false,
        message: 'This course does not have a WhatsApp group'
      });
    }

    // Generate temporary token for WhatsApp group access
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token (you might want to create a separate model for this)
    // For now, we'll use a simple approach

    res.json({
      success: true,
      data: {
        token,
        expiresAt,
        whatsappGroupLink: course.whatsappGroupLink
      }
    });
  } catch (error) {
    console.error('❌ Generate group token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate group token',
      error: error.message
    });
  }
};

/**
 * Join WhatsApp group using token
 */
const joinGroup = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { token } = req.query;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.hasWhatsappGroup || !course.whatsappGroupLink) {
      return res.status(400).json({
        success: false,
        message: 'This course does not have a WhatsApp group'
      });
    }

    // For now, just redirect to WhatsApp group
    // In a real implementation, you'd validate the token
    res.redirect(course.whatsappGroupLink);
  } catch (error) {
    console.error('❌ Join group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join group',
      error: error.message
    });
  }
};

/**
 * Archive a course (soft delete)
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

    const socketService = getSocketService(req);
    if (socketService) {
      socketService.broadcastContentUpdate('COURSE_DELETED', { id: course._id, courseId: course._id });
    }

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

    const socketService = getSocketService(req);
    if (socketService) {
      socketService.notifyCourseUpdate({ id: course._id, title: course.title, status: course.status });
    }

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
 * Get featured courses
 */
const getFeaturedCourses = async (req, res) => {
  try {
    const courses = await Course.find({ 
      featured: true, 
      status: 'active', // Only show active featured courses
      isPublic: true 
    })
      .select('-__v')
      .sort({ createdAt: -1 })
      .populate('videos', 'title s3Key order fileSize duration')
      .lean();

    // Determine which featured courses are purchased for the authenticated user
    let purchasedCourseIds = [];
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded && decoded.userId) {
          const User = require('../models/User');
          const user = await User.findById(decoded.userId);

          if (user && Array.isArray(user.purchasedCourses) && user.purchasedCourses.length > 0) {
            purchasedCourseIds = user.purchasedCourses.map(id => id.toString());
          }
        }
      } catch (error) {
        // Invalid token - treat as public user (no purchased courses)
      }
    }

    const featuredWithPurchaseStatus = await Promise.all(
      courses.map(async (course) => {
        const courseWithFreshThumbnail = await attachFreshThumbnailUrl(course);
        return {
          ...courseWithFreshThumbnail,
          isPurchased: purchasedCourseIds.includes(course._id.toString())
        };
      })
    );

    res.json({
      success: true,
      data: {
        courses: featuredWithPurchaseStatus
      }
    });
  } catch (error) {
    console.error('❌ Get featured courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get featured courses',
      error: error.message
    });
  }
};

/**
 * Get user's purchased courses
 */
const getUserPurchasedCourses = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // This would typically query through enrollments or purchases
    // For now, return empty array as placeholder
    res.json({
      success: true,
      data: {
        courses: []
      }
    });
  } catch (error) {
    console.error('❌ Get user purchased courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get purchased courses',
      error: error.message
    });
  }
};

/**
 * Enroll student in course
 */
const enrollStudent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

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

    // This would typically create an enrollment record
    // For now, just return success
    res.json({
      success: true,
      message: 'Successfully enrolled in course',
      data: {
        courseId: course._id,
        title: course.title
      }
    });
  } catch (error) {
    console.error('❌ Enroll student error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in course',
      error: error.message
    });
  }
};

/**
 * Debug authentication for course access
 * GET /api/courses/:id/debug-auth
 */
const debugCourseAuth = async (req, res) => {
  try {
    const { id } = req.params;


    // Get course info
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const isAdmin = req.admin || (req.user && req.user.role === 'admin');

    res.json({
      success: true,
      data: {
        debug: {
          headers: {
            authorization: req.headers.authorization ? 'present' : 'missing',
            contentType: req.headers['content-type'],
            userAgent: req.headers['user-agent'],
            origin: req.headers.origin
          },
          user: {
            hasUser: !!req.user,
            userInfo: req.user ? {
              id: req.user.id,
              email: req.user.email,
              role: req.user.role
            } : null,
            hasAdmin: !!req.admin,
            adminInfo: req.admin ? {
              email: req.admin.email,
              role: req.admin.role
            } : null
          },
          course: {
            id: course._id,
            title: course.title?.en || course.title,
            status: course.status,
            isPublic: course.isPublic
          },
          access: {
            isAdmin: !!isAdmin,
            shouldAllowAccess: isAdmin || (course.isPublic && course.status === 'active'),
            finalDecision: isAdmin ? 'admin-access' : (course.isPublic && course.status === 'active') ? 'public-access' : 'denied'
          }
        },
        course: course.toObject()
      }
    });
  } catch (error) {
    console.error('❌ Debug auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
};

module.exports = {
  getAllCourses,
  getFeaturedCourses,
  getUserPurchasedCourses,
  getCourseById,
  createCourse,
  uploadThumbnail,
  uploadVideo,
  markCourseComplete,
  updateCourse,
  deactivateCourse,
  reactivateCourse,
  archiveCourse,
  unarchiveCourse,
  getDeletionSummary,
  deleteCourse,
  generateGroupToken,
  joinGroup,
  enrollStudent,
  debugCourseAuth  // Add debug endpoint
};
