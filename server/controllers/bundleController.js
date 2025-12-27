const Bundle = require('../models/Bundle');
const Course = require('../models/Course');
const User = require('../models/User');
const { 
  uploadFileWithOrganization,
  getPublicUrl
} = require('../utils/s3');
const { 
  uploadCourseFile,
  validateFile,
  getSignedUrlForFile,
  deleteFileFromS3
} = require('../utils/s3CourseManager');

/**
 * Create a new bundle
 */
const createBundle = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      longDescription,
      price, 
      originalValue,
      courseIds, 
      category, 
      tags, 
      featured = false,
      isPublic = true, 
      maxEnrollments 
    } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    // Validate required fields
    if (!title || !description || !price || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, description, price, and at least one course ID are required' 
      });
    }

    // Validate that all course IDs exist
    const courses = await Course.find({ _id: { $in: courseIds } });
    if (courses.length !== courseIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'One or more course IDs are invalid' 
      });
    }

    // Calculate original value if not provided (sum of course prices)
    let calculatedOriginalValue = originalValue;
    if (!calculatedOriginalValue) {
      calculatedOriginalValue = courses.reduce((sum, course) => sum + (course.price || 0), 0);
    }

    // Create the bundle
    const bundle = new Bundle({
      title,
      description,
      longDescription: longDescription || description,
      price: parseFloat(price),
      originalValue: calculatedOriginalValue,
      courseIds,
      category: category || null,
      featured: Boolean(featured),
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()).filter(tag => tag)) : [],
      isPublic,
      maxEnrollments: maxEnrollments ? parseInt(maxEnrollments) : null,
      createdBy: adminEmail,
      lastModifiedBy: adminEmail
    });

    await bundle.save();

    console.log(`✅ Bundle created: ${bundle.title} (ID: ${bundle._id}) by ${adminEmail}`);

    res.status(201).json({
      success: true,
      message: 'Bundle created successfully',
      data: {
        bundle: {
          id: bundle._id,
          title: bundle.title,
          slug: bundle.slug,
          status: bundle.status
        }
      }
    });

  } catch (error) {
    console.error('❌ Create bundle error:', error);
    
    // Handle duplicate key error (slug already exists)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
      return res.status(409).json({
        success: false,
        message: 'A bundle with this title already exists. Please use a different title.',
        error: 'Duplicate bundle title'
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
      message: 'Failed to create bundle',
      error: error.message
    });
  }
};

/**
 * Upload thumbnail for a bundle
 */
const uploadThumbnail = async (req, res) => {
  try {
    console.log('\n🖼️  Bundle thumbnail upload request received...');
    
    const { bundleId } = req.params;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail file is required'
      });
    }

    // Validate file
    validateFile(req.file, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'], 5 * 1024 * 1024); // 5MB max

    const bundle = await Bundle.findById(bundleId);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found'
      });
    }

    // Store old thumbnail for cleanup
    const oldThumbnailS3Key = bundle.thumbnailS3Key;

    // Upload to S3
    const uploadResult = await uploadFileWithOrganization(
      req.file,
      'bundle-thumbnails',
      `${bundle.slug || bundle._id}_${Date.now()}`
    );

    // Clean up temporary file if using disk storage
    if (req.file.path) {
      require('fs').unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }

    // Ensure we have a public URL
    let thumbnailURL = uploadResult.publicUrl;
    if (!thumbnailURL) {
      thumbnailURL = getPublicUrl(uploadResult.s3Key);
    }

    // Update bundle with thumbnail URL
    bundle.thumbnailURL = thumbnailURL;
    bundle.thumbnailS3Key = uploadResult.s3Key;
    bundle.lastModifiedBy = adminEmail;
    await bundle.save();

    // Delete old thumbnail from S3 if it exists
    if (oldThumbnailS3Key) {
      try {
        await deleteFileFromS3(oldThumbnailS3Key);
        console.log(`✅ Old thumbnail deleted: ${oldThumbnailS3Key}`);
      } catch (deleteError) {
        console.error('⚠️  Failed to delete old thumbnail:', deleteError);
      }
    }

    console.log(`✅ Bundle thumbnail upload completed: ${bundle.title} by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: {
        thumbnailURL: thumbnailURL,
        s3Key: uploadResult.s3Key
      }
    });

  } catch (error) {
    console.error('❌ Upload bundle thumbnail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload thumbnail',
      error: error.message
    });
  }
};

/**
 * Get all bundles with filtering and pagination
 */
const getAllBundles = async (req, res) => {
  try {
    console.log('🔍 getAllBundles called with query:', req.query);
    
    const { 
      status, 
      category, 
      search, 
      featured,
      limit = 20, 
      page = 1 
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    
    // Filter by status
    if (status && status === 'all') {
      // Admin wants to see all bundles regardless of status
    } else if (status && ['active', 'inactive', 'archived'].includes(status)) {
      query.status = status;
    } else {
      // Default to active bundles for public access
      query.status = 'active';
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by featured
    if (featured === 'true') {
      query.featured = true;
    }

    // Filter by search term
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { longDescription: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    console.log('📊 Database query:', JSON.stringify(query, null, 2));

    const bundles = await Bundle.find(query)
      .populate('courseIds', 'title description thumbnailURL price category level tags totalEnrollments')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`📚 Found ${bundles.length} bundles from database`);

    // Ensure all bundles have proper public thumbnail URLs
    const bundlesWithFixedThumbnails = bundles.map(bundle => {
      if (bundle.thumbnailS3Key && (!bundle.thumbnailURL || !bundle.thumbnailURL.includes('s3.amazonaws.com'))) {
        bundle.thumbnailURL = getPublicUrl(bundle.thumbnailS3Key);
      }
      return bundle;
    });

    const total = await Bundle.countDocuments(query);
    console.log(`📊 Total bundles in database: ${total}`);

    res.json({
      success: true,
      data: {
        bundles: bundlesWithFixedThumbnails,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get all bundles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bundles',
      error: error.message
    });
  }
};

/**
 * Get featured bundles
 */
const getFeaturedBundles = async (req, res) => {
  try {
    const bundles = await Bundle.find({ 
      status: 'active',
      isPublic: true,
      featured: true
    })
      .populate('courseIds', 'title description thumbnailURL price category level tags totalEnrollments')
      .sort({ createdAt: -1 })
      .limit(10);

    // Ensure all bundles have proper public thumbnail URLs
    const bundlesWithFixedThumbnails = bundles.map(bundle => {
      if (bundle.thumbnailS3Key && (!bundle.thumbnailURL || !bundle.thumbnailURL.includes('s3.amazonaws.com'))) {
        bundle.thumbnailURL = getPublicUrl(bundle.thumbnailS3Key);
      }
      return bundle;
    });

    res.json({
      success: true,
      data: {
        bundles: bundlesWithFixedThumbnails
      }
    });

  } catch (error) {
    console.error('❌ Get featured bundles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured bundles',
      error: error.message
    });
  }
};

/**
 * Get bundle by ID
 */
const getBundleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first, then by slug
    let bundle = await Bundle.findById(id);
    if (!bundle) {
      bundle = await Bundle.findOne({ slug: id });
    }

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found'
      });
    }

    // Check if bundle is accessible (active or user has purchased it)
    const authHeader = req.headers.authorization;
    let userHasPurchased = false;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded && decoded.userId) {
          const enrollment = bundle.getStudentEnrollment(decoded.userId);
          userHasPurchased = !!enrollment;
        }
      } catch (error) {
        // Invalid token, continue without user info
      }
    }

    // Populate course details
    await bundle.populate('courseIds', 'title description thumbnailURL price category level tags totalEnrollments videos');

    // Fix thumbnail URL if needed
    if (bundle.thumbnailS3Key && (!bundle.thumbnailURL || !bundle.thumbnailURL.includes('s3.amazonaws.com'))) {
      bundle.thumbnailURL = getPublicUrl(bundle.thumbnailS3Key);
    }

    res.json({
      success: true,
      data: {
        bundle,
        userHasPurchased
      }
    });

  } catch (error) {
    console.error('❌ Get bundle by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bundle',
      error: error.message
    });
  }
};

/**
 * Update bundle metadata
 */
const updateBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      longDescription,
      price, 
      originalValue,
      courseIds, 
      category, 
      tags, 
      featured,
      status, 
      isPublic, 
      maxEnrollments 
    } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    const bundle = await Bundle.findById(id);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found'
      });
    }

    // Update fields
    if (title) bundle.title = title;
    if (description) bundle.description = description;
    if (longDescription !== undefined) bundle.longDescription = longDescription;
    if (price) bundle.price = parseFloat(price);
    if (originalValue !== undefined) bundle.originalValue = parseFloat(originalValue);
    if (category !== undefined) bundle.category = category;
    if (featured !== undefined) bundle.featured = Boolean(featured);
    if (tags) {
      if (Array.isArray(tags)) {
        bundle.tags = tags;
      } else if (typeof tags === 'string') {
        bundle.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }
    if (status && ['active', 'inactive', 'archived'].includes(status)) {
      bundle.status = status;
    }
    if (typeof isPublic === 'boolean') bundle.isPublic = isPublic;
    if (maxEnrollments !== undefined) bundle.maxEnrollments = maxEnrollments ? parseInt(maxEnrollments) : null;

    // Update course IDs if provided
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      // Validate that all course IDs exist
      const courses = await Course.find({ _id: { $in: courseIds } });
      if (courses.length !== courseIds.length) {
        return res.status(400).json({ 
          success: false, 
          message: 'One or more course IDs are invalid' 
        });
      }
      bundle.courseIds = courseIds;
      
      // Recalculate original value if not provided
      if (!originalValue) {
        bundle.originalValue = courses.reduce((sum, course) => sum + (course.price || 0), 0);
      }
    }

    bundle.lastModifiedBy = adminEmail;
    await bundle.save();

    console.log(`✅ Bundle updated: ${bundle.title} by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Bundle updated successfully',
      data: {
        bundle: {
          id: bundle._id,
          title: bundle.title,
          status: bundle.status
        }
      }
    });

  } catch (error) {
    console.error('❌ Update bundle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bundle',
      error: error.message
    });
  }
};

/**
 * Delete a bundle
 */
const deleteBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    const bundle = await Bundle.findById(id);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found'
      });
    }

    // Delete thumbnail from S3 if it exists
    if (bundle.thumbnailS3Key) {
      try {
        await deleteFileFromS3(bundle.thumbnailS3Key);
        console.log(`✅ Bundle thumbnail deleted: ${bundle.thumbnailS3Key}`);
      } catch (deleteError) {
        console.error('⚠️  Failed to delete bundle thumbnail:', deleteError);
      }
    }

    // Delete the bundle
    await Bundle.findByIdAndDelete(id);

    console.log(`✅ Bundle deleted: ${bundle.title} by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Bundle deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete bundle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bundle',
      error: error.message
    });
  }
};

/**
 * Archive a bundle
 */
const archiveBundle = async (req, res) => {
  try {
    const { bundleId } = req.params;
    const { reason, gracePeriodMonths = 6 } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    const bundle = await Bundle.findById(bundleId);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found'
      });
    }

    await bundle.archive(reason || 'Admin request', gracePeriodMonths);

    console.log(`✅ Bundle archived: ${bundle.title} by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Bundle archived successfully',
      data: {
        bundleId: bundle._id,
        archivedAt: bundle.archivedAt,
        archiveReason: bundle.archiveReason,
        gracePeriod: bundle.archiveGracePeriod
      }
    });

  } catch (error) {
    console.error('❌ Archive bundle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive bundle',
      error: error.message
    });
  }
};

/**
 * Unarchive a bundle
 */
const unarchiveBundle = async (req, res) => {
  try {
    const { bundleId } = req.params;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';

    const bundle = await Bundle.findById(bundleId);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found'
      });
    }

    if (bundle.status !== 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Bundle is not archived'
      });
    }

    await bundle.unarchive();

    console.log(`✅ Bundle unarchived: ${bundle.title} by ${adminEmail}`);

    res.json({
      success: true,
      message: 'Bundle unarchived successfully',
      data: {
        bundleId: bundle._id,
        status: bundle.status
      }
    });

  } catch (error) {
    console.error('❌ Unarchive bundle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unarchive bundle',
      error: error.message
    });
  }
};

/**
 * Get user's purchased bundles
 */
const getUserPurchasedBundles = async (req, res) => {
  try {
    console.log('🔍 getUserPurchasedBundles called');
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get user's purchased bundle IDs
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.purchasedBundles || user.purchasedBundles.length === 0) {
      return res.json({
        success: true,
        data: {
          bundles: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        }
      });
    }

    console.log(`🔍 User has ${user.purchasedBundles.length} purchased bundles`);

    // Get purchased bundles with pagination
    const purchasedBundles = await Bundle.find({
      _id: { $in: user.purchasedBundles }
    })
    .populate('courseIds', 'title description thumbnailURL price category level tags totalEnrollments videos')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    console.log(`📚 Found ${purchasedBundles.length} purchased bundles from database`);

    // Ensure all bundles have proper public thumbnail URLs
    const bundlesWithFixedThumbnails = purchasedBundles.map(bundle => {
      if (bundle.thumbnailS3Key && (!bundle.thumbnailURL || !bundle.thumbnailURL.includes('s3.amazonaws.com'))) {
        bundle.thumbnailURL = getPublicUrl(bundle.thumbnailS3Key);
      }
      return bundle;
    });

    const total = await Bundle.countDocuments({
      _id: { $in: user.purchasedBundles }
    });

    console.log(`📊 Total purchased bundles: ${total}`);

    res.json({
      success: true,
      data: {
        bundles: bundlesWithFixedThumbnails,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get user purchased bundles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchased bundles',
      error: error.message
    });
  }
};

module.exports = {
  createBundle,
  uploadThumbnail,
  getAllBundles,
  getFeaturedBundles,
  getBundleById,
  getUserPurchasedBundles,
  updateBundle,
  deleteBundle,
  archiveBundle,
  unarchiveBundle
};
