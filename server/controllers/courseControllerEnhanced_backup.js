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
  deleteFileFromS3,
  getThumbnailUrl
} = require('../utils/s3CourseManager');

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

    // Create course without versioning
    const course = new Course({
      title,
      description,
      price: parseFloat(price),
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      level,
      isPublic,
      maxEnrollments: maxEnrollments ? parseInt(maxEnrollments) : undefined,
      hasWhatsappGroup: hasWhatsappGroup || false,
      whatsappGroupLink: whatsappGroupLink || '',
      createdBy: adminEmail,
      lastModifiedBy: adminEmail
    });

    await course.save();

    console.log(`✅ Course created: ${course.title} by ${adminEmail}`);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: {
        id: course._id,
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
    console.log('\n🖼️  Thumbnail upload request received...');
    
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
    
    console.log('📁 Preserving old thumbnail URL:', oldCourseThumbnailURL);
    
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

    console.log(`✅ Video uploaded for course: ${course.title} by ${adminEmail}`);

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

const uploadVideo = async (req, res) => {
        message: 'Course not found'
      });
    }

    if (course.status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'Course is already deactivated'
      });
    }

    // Deactivate the course
    await course.deactivate(reason || 'Admin request');

    console.log(`✅ Course deactivated: ${course.title} by ${adminEmail}`);

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

    console.log(`✅ Course reactivated: ${course.title} by ${adminEmail}`);

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
 * Get deletion summary for a course (before deletion)
 * Returns what will be deleted without actually deleting
 */
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

    // Get counts of what will be deleted
    const courseVersions = await CourseVersion.find({ courseId: id });
    const videos = await Video.find({ courseId: id });
    const Material = require('../models/Material');
    const materials = await Material.find({ courseId: id });
    const User = require('../models/User');
    const usersWithCourse = await User.countDocuments({ purchasedCourses: id });
    const Bundle = require('../models/Bundle');
    const bundlesWithCourse = await Bundle.find({ courseIds: id });

    // Count S3 files
    let s3FilesCount = 0;
    if (course.thumbnailS3Key) s3FilesCount++;
    s3FilesCount += videos.filter(v => v.s3Key).length;
    s3FilesCount += materials.filter(m => m.s3Key).length;

    const titleString = typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || 'Untitled');

    res.json({
      success: true,
      data: {
        course: {
          id: course._id,
          title: titleString,
          price: course.price,
          totalEnrollments: course.totalEnrollments || 0
        },
        summary: {
          videos: videos.length,
          materials: materials.length,
          versions: courseVersions.length,
          usersAffected: usersWithCourse,
          bundlesAffected: bundlesWithCourse.length,
          s3Files: s3FilesCount,
          bundles: bundlesWithCourse.map(b => ({
            id: b._id,
            title: typeof b.title === 'string' ? b.title : (b.title?.en || b.title?.tg || 'Untitled'),
            willBecomeInactive: b.courseIds.length === 1 // Will have 0 courses after removal
          }))
        }
      }
    });
  } catch (error) {
    console.error('❌ Get deletion summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deletion summary',
      error: error.message
    });
  }
};

/**
 * Delete course permanently (admin only)
 * Deletes all course data from database and all files from AWS S3
 * Uses database transactions for atomicity
 * Logs deletion to audit log
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

    // Get all videos associated with this course
    const videos = await Video.find({ courseId: id });
    console.log(`🎥 Found ${videos.length} videos to delete`);

    // Get all materials associated with this course
    const Material = require('../models/Material');
    const materials = await Material.find({ courseId: id });
    console.log(`📦 Found ${materials.length} materials to delete`);

    // Delete files from S3
    const s3DeletionPromises = [];

    // Delete thumbnail from S3
    if (course.thumbnailS3Key) {
      console.log(`🗑️ Deleting thumbnail from S3: ${course.thumbnailS3Key}`);
      s3DeletionPromises.push(
        deleteFileFromS3(course.thumbnailS3Key).catch(error => {
          console.warn(`⚠️ Failed to delete thumbnail from S3: ${error.message}`);
        })
      );
    }

    // Delete all video files from S3
    for (const video of videos) {
      if (video.s3Key) {
        console.log(`🗑️ Deleting video from S3: ${video.s3Key}`);
        s3DeletionPromises.push(
          deleteFileFromS3(video.s3Key).catch(error => {
            console.warn(`⚠️ Failed to delete video from S3: ${error.message}`);
          })
        );
      }
    }

    // Delete all material files from S3
    for (const material of materials) {
      if (material.s3Key) {
        console.log(`🗑️ Deleting material from S3: ${material.s3Key}`);
        s3DeletionPromises.push(
          deleteFileFromS3(material.s3Key).catch(error => {
            console.warn(`⚠️ Failed to delete material from S3: ${error.message}`);
          })
        );
      }
    }

    // Get user info for audit log
    const User = require('../models/User');
    const adminUser = await User.findOne({ email: adminEmail });
    const adminUserId = adminUser ? adminUser._id : null;

    // Get IP address and user agent for audit log
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Extract title for logging
    const titleString = typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || 'Untitled');

    // Get bundles info before deletion
    const Bundle = require('../models/Bundle');
    const bundlesWithCourse = await Bundle.find({ courseIds: id });
    const bundlesAffected = bundlesWithCourse.length;

    // Count S3 files
    let s3FilesCount = 0;
    if (course.thumbnailS3Key) s3FilesCount++;
    s3FilesCount += videos.filter(v => v.s3Key).length;
    s3FilesCount += materials.filter(m => m.s3Key).length;

    // Wait for all S3 deletions to complete (outside transaction)
    await Promise.all(s3DeletionPromises);
    console.log(`✅ S3 deletion completed`);

    // Start database transaction for atomicity
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete all videos from database
      if (videos.length > 0) {
        await Video.deleteMany({ courseId: id }).session(session);
        console.log(`✅ Deleted ${videos.length} videos from database`);
      }

      // Delete all materials from database
      if (materials.length > 0) {
        await Material.deleteMany({ courseId: id }).session(session);
        console.log(`✅ Deleted ${materials.length} materials from database`);
      }

      // Delete all course versions from database
      if (courseVersions.length > 0) {
        await CourseVersion.deleteMany({ courseId: id }).session(session);
        console.log(`✅ Deleted ${courseVersions.length} course versions from database`);
      }

      // Remove course from users' purchasedCourses arrays
      const updateResult = await User.updateMany(
        { purchasedCourses: id },
        { $pull: { purchasedCourses: id } }
      ).session(session);
      console.log(`✅ Removed course from ${updateResult.modifiedCount} users' purchased courses`);

      // Remove course from bundles' courseIds arrays
      if (bundlesWithCourse.length > 0) {
        for (const bundle of bundlesWithCourse) {
          bundle.courseIds = bundle.courseIds.filter(cId => cId.toString() !== id.toString());
          
          // If bundle has no courses left, mark it as inactive
          if (bundle.courseIds.length === 0) {
            bundle.status = 'inactive';
            bundle.isPublic = false;
            console.log(`⚠️ Bundle "${bundle.title}" has no courses left, marking as inactive`);
          }
          
          await bundle.save({ session });
        }
        console.log(`✅ Removed course from ${bundlesWithCourse.length} bundles`);
      }

      // Delete the main course
      await Course.findByIdAndDelete(id).session(session);
      console.log(`✅ Deleted course "${titleString}" from database`);

      // Create audit log entry
      const AuditLog = require('../models/AuditLog');
      await AuditLog.logAction({
        action: 'course_deleted',
        entityType: 'course',
        entityId: id,
        entityTitle: titleString,
        performedBy: adminEmail,
        performedById: adminUserId,
        details: {
          coursePrice: course.price,
          totalEnrollments: course.totalEnrollments || 0,
          category: course.category,
          level: course.level
        },
        deletionSummary: {
          videosDeleted: videos.length,
          materialsDeleted: materials.length,
          versionsDeleted: courseVersions.length,
          usersAffected: updateResult.modifiedCount,
          bundlesAffected: bundlesAffected,
          s3FilesDeleted: s3FilesCount
        },
        ipAddress: ipAddress,
        userAgent: userAgent
      });

      // Commit transaction
      await session.commitTransaction();
      console.log(`🎉 Course deletion completed successfully by ${adminEmail}`);

      res.json({
        success: true,
        message: 'Course deleted successfully',
        data: {
          courseId: id,
          courseTitle: titleString,
          deletedVideos: videos.length,
          deletedMaterials: materials.length,
          deletedVersions: courseVersions.length,
          removedFromUsers: updateResult.modifiedCount,
          bundlesAffected: bundlesAffected,
          s3FilesDeleted: s3FilesCount
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

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
    
    const { status, category, search, level, tag, priceRange, limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    
    // Build sort object
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    let sortObject = {};
    
    // Map frontend sort fields to database fields
    switch (sortBy) {
      case 'title':
        sortObject = { title: sortDirection };
        break;
      case 'price':
        sortObject = { price: sortDirection };
        break;
      case 'totalEnrollments':
        sortObject = { totalEnrollments: sortDirection };
        break;
      case 'createdAt':
      default:
        sortObject = { createdAt: sortDirection };
        break;
    }
    
    // Check if user is authenticated and enrolled
    const authHeader = req.headers.authorization;
    let userId = null;
    let enrolledCourseIds = [];
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.userId) {
          userId = decoded.userId;
          // Get user's enrolled/purchased courses
          const User = require('../models/User');
          const user = await User.findById(userId);
          if (user && user.purchasedCourses) {
            enrolledCourseIds = user.purchasedCourses.map(id => id.toString());
          }
        }
      } catch (error) {
        // Invalid token, treat as public user
      }
    }
    
    // Filter by status
    if (status && status === 'all') {
      // Admin wants to see all courses regardless of status
      // Don't add any status filter
    } else if (status && ['active', 'inactive', 'archived'].includes(status)) {
      query.status = status;
    } else {
      // For public/non-enrolled users: only show active courses (exclude inactive/archived)
      // For enrolled users: show active courses + their enrolled inactive courses (but not archived)
      if (userId && enrolledCourseIds.length > 0) {
        // Enrolled users can see active courses + their enrolled inactive courses
        const mongoose = require('mongoose');
        query.$and = [
          {
            $or: [
              { status: 'active' },
              { 
                status: 'inactive',
                _id: { $in: enrolledCourseIds.map(id => new mongoose.Types.ObjectId(id)) }
              }
            ]
          },
          { status: { $ne: 'archived' } }
        ];
      } else {
        // Public users only see active courses (exclude inactive and archived)
        query.status = 'active';
      }
    }

    // Build additional filters that need to be combined
    const additionalFilters = {};

    // Filter by category
    if (category) {
      additionalFilters.category = category;
    }

    // Filter by level
    if (level) {
      console.log(`🔍 [getAllCourses] Filtering by level: ${level}`);
      additionalFilters.level = level;
    }

    // Filter by tag
    if (tag) {
      additionalFilters.tags = { $in: [tag] };
    }

    // Filter by price range
    if (priceRange) {
      switch (priceRange) {
        case 'free':
          additionalFilters.price = 0;
          break;
        case 'under-50':
          additionalFilters.price = { $gt: 0, $lt: 50 };
          break;
        case '50-100':
          additionalFilters.price = { $gte: 50, $lte: 100 };
          break;
        case 'over-100':
          additionalFilters.price = { $gt: 100 };
          break;
      }
    }

    // Combine additional filters with existing query
    // If $and exists, add filters to $and array; otherwise add directly to query
    if (query.$and && Object.keys(additionalFilters).length > 0) {
      query.$and.push(additionalFilters);
    } else if (Object.keys(additionalFilters).length > 0) {
      Object.assign(query, additionalFilters);
    }

    // Filter by search term (needs special handling with $and)
    if (search && search.trim()) {
      const searchFilter = {
        $or: [
          { title: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } }
        ]
      };
      
      if (query.$and) {
        query.$and.push(searchFilter);
      } else {
        query.$or = searchFilter.$or;
      }
    }

    console.log('📊 Database query:', JSON.stringify(query, null, 2));
    if (level) {
      console.log(`✅ [getAllCourses] Level filter applied: ${level}`);
    }

    const courses = await Course.find(query)
      .populate('videos')
      .sort(sortObject)
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`📚 Found ${courses.length} courses from database`);

    // Filter out purchased courses for logged-in users (if not already done above)
    let filteredCourses = courses;
    
    // Reuse authHeader from above - check for authentication token in headers
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
            
            // Don't filter out purchased courses - show them with isPurchased flag
            // This allows users to see their purchased courses on the courses page
            console.log(`📚 Showing all ${courses.length} courses (including ${purchasedCourseIds.length} purchased)`);
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

    // Get purchased course IDs for authenticated users
    let purchasedCourseIds = [];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded && decoded.userId) {
          const User = require('../models/User');
          const user = await User.findById(decoded.userId);
          
          if (user && user.purchasedCourses && user.purchasedCourses.length > 0) {
            purchasedCourseIds = user.purchasedCourses.map(id => id.toString());
          }
        }
      } catch (error) {
        // Invalid token, no purchased courses
      }
    }

    // Ensure all courses have proper thumbnail URLs (using presigned URLs for thumbnails)
    // Also add isPurchased flag for authenticated users
    const coursesWithFixedThumbnails = await Promise.all(
      filteredCourses.map(async (course) => {
        console.log(`🔍 Course: "${course.title}"`);
        // Processing course thumbnail
        
        if (course.thumbnailS3Key) {
          // Use getThumbnailUrl which generates presigned URLs for thumbnails
          try {
            const thumbnailUrl = await getThumbnailUrl(course.thumbnailS3Key);
            if (thumbnailUrl) {
              course.thumbnailURL = thumbnailUrl;
              console.log(`   ✅ Generated thumbnail URL for course`);
            } else {
              console.log(`   ⚠️  Could not generate thumbnail URL`);
            }
          } catch (error) {
            console.error(`   ❌ Error generating thumbnail URL:`, error);
            // Fallback to public URL if presigned URL generation fails
            if (!course.thumbnailURL || !course.thumbnailURL.includes('s3.amazonaws.com')) {
              course.thumbnailURL = getPublicUrl(course.thumbnailS3Key);
            }
          }
        } else if (!course.thumbnailURL || !course.thumbnailURL.includes('s3.amazonaws.com')) {
          // If no S3 key but we have a URL that doesn't look valid, try to keep existing or set to null
          console.log(`   ⚠️  No thumbnailS3Key found for course`);
        }
        
        // Add isPurchased flag
        const courseObj = course.toObject ? course.toObject() : course;
        const isPurchased = purchasedCourseIds.includes(course._id.toString());
        courseObj.isPurchased = isPurchased;
        
        // Final thumbnail URL processed
        return courseObj;
      })
    );

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
 * Get featured courses (max 3 for homepage)
 */
const getFeaturedCourses = async (req, res) => {
  try {
    const courses = await Course.find({ 
      status: 'active',
      isPublic: true,
      featured: true
    })
      .populate('videos')
      .sort({ createdAt: -1 })
      .limit(3);

    // Get user's purchased courses to add purchase status
    let purchasedCourseIds = [];
    let decoded = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded && decoded.userId) {
          const User = require('../models/User');
          const user = await User.findById(decoded.userId);
          
          if (user && user.purchasedCourses && user.purchasedCourses.length > 0) {
            purchasedCourseIds = user.purchasedCourses.map(id => id.toString());
          }
        }
      } catch (error) {
        // Invalid token, treat as public user
      }
    }

    // Ensure all courses have proper thumbnail URLs (use presigned URLs) and add purchase status
    const coursesWithFixedThumbnails = await Promise.all(courses.map(async (course) => {
      if (course.thumbnailS3Key) {
        try {
          course.thumbnailURL = await getThumbnailUrl(course.thumbnailS3Key);
        } catch (error) {
          console.error(`Error generating thumbnail URL for course ${course._id}:`, error);
          course.thumbnailURL = getPublicUrl(course.thumbnailS3Key);
        }
      }
      
      const courseObj = course.toObject ? course.toObject() : course;
      courseObj.isPurchased = purchasedCourseIds.includes(course._id.toString());
      
      console.log(`🔍 [Featured] Course ${course._id}:`, {
        title: course.title,
        isPurchased: courseObj.isPurchased,
        purchasedCourseIds,
        userId: decoded?.userId
      });
      
      return courseObj;
    }));

    res.json(coursesWithFixedThumbnails);

  } catch (error) {
    console.error('❌ Get featured courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured courses',
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

    // Ensure all courses have proper thumbnail URLs (using presigned URLs for thumbnails)
    const coursesWithFixedThumbnails = await Promise.all(
      purchasedCourses.map(async (course) => {
        console.log(`🔍 Purchased Course: "${course.title}"`);
        // Processing course thumbnail
        
        if (course.thumbnailS3Key) {
          // Use getThumbnailUrl which generates presigned URLs for thumbnails
          try {
            const thumbnailUrl = await getThumbnailUrl(course.thumbnailS3Key);
            if (thumbnailUrl) {
              course.thumbnailURL = thumbnailUrl;
              console.log(`   ✅ Generated thumbnail URL for purchased course`);
            } else {
              console.log(`   ⚠️  Could not generate thumbnail URL`);
            }
          } catch (error) {
            console.error(`   ❌ Error generating thumbnail URL:`, error);
            // Fallback to public URL if presigned URL generation fails
            if (!course.thumbnailURL || !course.thumbnailURL.includes('s3.amazonaws.com')) {
              course.thumbnailURL = getPublicUrl(course.thumbnailS3Key);
            }
          }
        } else if (!course.thumbnailURL || !course.thumbnailURL.includes('s3.amazonaws.com')) {
          // If no S3 key but we have a URL that doesn't look valid, try to keep existing or set to null
          console.log(`   ⚠️  No thumbnailS3Key found for purchased course`);
        }
        
        // Final thumbnail URL processed
        return course;
      })
    );

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

    // Determine which version to fetch
    // If version is explicitly provided in query, use it
    // Otherwise, if user has purchased, use their purchased version
    // Otherwise, use current version
    let versionToFetch;
    if (version) {
      versionToFetch = parseInt(version);
    } else {
      // Check if user has purchased and get their purchased version
      const userId = req.user?.userId || req.user?.id || req.user?._id;
      if (userId) {
        const { getUserPurchasedVersion } = require('../utils/purchaseUtils');
        const purchasedVersion = await getUserPurchasedVersion(userId, id);
        if (purchasedVersion) {
          versionToFetch = purchasedVersion;
          console.log(`📦 [getCourseById] User ${userId} purchased version ${purchasedVersion} of course ${id}`);
        } else {
          versionToFetch = course.currentVersion || course.version || 1;
        }
      } else {
        versionToFetch = course.currentVersion || course.version || 1;
      }
    }
    
    console.log(`🔍 [getCourseById] Fetching course ${id}, version: ${versionToFetch}`);
    
    let courseVersion;
    if (version) {
      courseVersion = await CourseVersion.findOne({ 
        courseId: id, 
        versionNumber: parseInt(version) 
      }).populate('videos');
    } else {
      courseVersion = await CourseVersion.findOne({ 
        courseId: id, 
        versionNumber: versionToFetch 
      }).populate('videos');
    }

    if (!courseVersion) {
      console.log(`❌ [getCourseById] CourseVersion not found for course ${id}, version ${versionToFetch}`);
      return res.status(404).json({
        success: false,
        message: `Course version ${versionToFetch} not found`
      });
    }
    
    console.log(`✅ [getCourseById] Found CourseVersion ${courseVersion.versionNumber}, videos array length: ${courseVersion.videos?.length || 0}`);
    if (courseVersion.videos && courseVersion.videos.length > 0) {
      console.log(`📹 [getCourseById] First video from populate:`, {
        id: courseVersion.videos[0]._id,
        title: courseVersion.videos[0].title,
        isObjectId: courseVersion.videos[0].constructor.name === 'ObjectId'
      });
    }

    // Get all versions for this course
    const allVersions = await CourseVersion.find({ courseId: id })
      .select('versionNumber title changeLog createdAt status')
      .sort({ versionNumber: -1 });

    // Populate the course's videos array with the current version's videos
    const courseData = course.toObject();
    
    // ALWAYS query videos directly from Video collection - don't rely on CourseVersion.videos array
    // This ensures we get ALL videos even if CourseVersion.videos array is out of sync
    const Video = require('../models/Video');
    
    // First, try to get videos from the current version
    let videos = await Video.find({ 
      courseId: id, 
      courseVersion: courseVersion.versionNumber,
      status: { $ne: 'deleted' }
    }).sort({ order: 1 });
    
    console.log(`📹 [getCourseById] Found ${videos.length} videos in version ${courseVersion.versionNumber}`);
    
    // If no videos in current version, OR if we have videos but want to ensure we have ALL videos,
    // check all versions and get videos from the latest version that has videos
    if (videos.length === 0) {
      console.log(`⚠️ [getCourseById] No videos in version ${courseVersion.versionNumber}, checking all versions...`);
      const allVideos = await Video.find({ 
        courseId: id, 
        status: { $ne: 'deleted' }
      }).sort({ courseVersion: -1, order: 1 }); // Sort by version (newest first), then order
      
      console.log(`📹 [getCourseById] Found ${allVideos.length} videos across all versions:`, 
        allVideos.map(v => ({ 
          id: v._id, 
          title: typeof v.title === 'string' ? v.title : (v.title?.en || v.title?.tg || 'Unknown'),
          version: v.courseVersion 
        }))
      );
      
      // Get videos from the latest version that has videos
      if (allVideos.length > 0) {
        // Group videos by version
        const videosByVersion = {};
        allVideos.forEach(v => {
          if (!videosByVersion[v.courseVersion]) {
            videosByVersion[v.courseVersion] = [];
          }
          videosByVersion[v.courseVersion].push(v);
        });
        
        console.log(`📹 [getCourseById] Videos by version:`, 
          Object.keys(videosByVersion).sort((a, b) => Number(b) - Number(a)).map(v => `v${v}: ${videosByVersion[v].length}`).join(', ')
        );
        
        // Use videos from the latest version that has videos
        const latestVersionWithVideos = Math.max(...Object.keys(videosByVersion).map(Number));
        videos = allVideos.filter(v => v.courseVersion === latestVersionWithVideos);
        console.log(`📹 [getCourseById] Using ${videos.length} videos from version ${latestVersionWithVideos} (fallback)`);
      }
    }
    
    // Final verification: Log what we're returning
    console.log(`📹 [getCourseById] Final result: Returning ${videos.length} videos`);
    videos.forEach((v, i) => {
      const title = typeof v.title === 'string' ? v.title : (v.title?.en || v.title?.tg || 'Unknown');
      console.log(`   ${i + 1}. ${title} (v${v.courseVersion})`);
    });
    
    courseData.videos = videos;
    
    // Fix thumbnail URL if needed (use presigned URL for thumbnails)
    if (courseData.thumbnailS3Key) {
      try {
        const thumbnailUrl = await getThumbnailUrl(courseData.thumbnailS3Key);
        if (thumbnailUrl) {
          courseData.thumbnailURL = thumbnailUrl;
          console.log(`   ✅ Generated thumbnail URL for course by ID`);
        }
      } catch (error) {
        console.error(`   ❌ Error generating thumbnail URL:`, error);
        // Fallback to public URL if presigned URL generation fails
        if (!courseData.thumbnailURL || !courseData.thumbnailURL.includes('s3.amazonaws.com')) {
          courseData.thumbnailURL = getPublicUrl(courseData.thumbnailS3Key);
        }
      }
    }
    
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

module.exports = {
  createCourse,
  uploadThumbnail,
  uploadVideo,
  createNewVersion,
  updateCourse,
  archiveCourse,
  unarchiveCourse,
  deactivateCourse,
  reactivateCourse,
  getDeletionSummary,
  deleteCourse,
  getAllCourses,
  getFeaturedCourses,
  getUserPurchasedCourses,
  getCourseById,
  enrollStudent
}; 