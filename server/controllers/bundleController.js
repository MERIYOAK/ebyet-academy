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
  deleteFileFromS3,
  getThumbnailUrl
} = require('../utils/s3CourseManager');

/**
 * Create a new bundle
 */
const createBundle = async (req, res) => {
  try {
    let { 
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

    // Parse bilingual title and description if they come as JSON strings
    try {
      if (title && typeof title === 'string' && title.startsWith('{')) {
        title = JSON.parse(title);
      }
      if (description && typeof description === 'string' && description.startsWith('{')) {
        description = JSON.parse(description);
      }
      if (longDescription && typeof longDescription === 'string' && longDescription.startsWith('{')) {
        longDescription = JSON.parse(longDescription);
      }
    } catch (e) {
      // If parsing fails, treat as regular string (backward compatibility)
      console.log('[createBundle] Title/description not JSON, using as string');
    }

    // Validate required fields - check for bilingual format
    const titleValid = typeof title === 'string' ? title.trim() : (title?.en?.trim() && title?.tg?.trim());
    const descriptionValid = typeof description === 'string' ? description.trim() : (description?.en?.trim() && description?.tg?.trim());
    
    if (!titleValid || !descriptionValid || !price || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title (both languages), description (both languages), price, and at least one course ID are required' 
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

    const bundleTitleDisplay = typeof bundle.title === 'string' ? bundle.title : (bundle.title?.en || bundle.title?.tg || '');
    console.log(`✅ Bundle created: ${bundleTitleDisplay} (ID: ${bundle._id}) by ${adminEmail}`);

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

    // Generate presigned URL for thumbnail (works without public access)
    let thumbnailURL = uploadResult.publicUrl;
    if (!thumbnailURL) {
      try {
        thumbnailURL = await getThumbnailUrl(uploadResult.s3Key);
      } catch (error) {
        console.error('❌ Error generating presigned URL for uploaded thumbnail:', error);
        // Fallback to public URL if presigned URL generation fails
        thumbnailURL = getPublicUrl(uploadResult.s3Key);
      }
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

    // Add hasReachedMaxEnrollments flag to each bundle for frontend use
    const bundlesWithEnrollmentStatus = bundles.map(bundle => {
      const bundleObj = bundle.toObject();
      bundleObj.hasReachedMaxEnrollments = bundle.maxEnrollments 
        ? bundle.totalEnrollments >= bundle.maxEnrollments 
        : false;
      return bundleObj;
    });

    console.log(`📚 Found ${bundles.length} bundles from database`);

    // Get user's purchased bundles to add purchase status (Udemy-style: show all bundles)
    let purchasedBundleIds = [];
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded && decoded.userId) {
          console.log('🔍 User is logged in, checking purchase status');
          console.log('🔍 User ID:', decoded.userId);
          
          // Get user's purchased bundles
          const User = require('../models/User');
          const user = await User.findById(decoded.userId);
          
          if (user && user.purchasedBundles && user.purchasedBundles.length > 0) {
            purchasedBundleIds = user.purchasedBundles.map(id => id.toString());
            console.log('🔍 User has purchased bundles:', purchasedBundleIds);
          } else {
            console.log('🔍 User has no purchased bundles');
          }
        }
      } catch (error) {
        console.log('🔍 Invalid token, showing all bundles without purchase status');
      }
    } else {
      console.log('🔍 No authentication token, showing all bundles without purchase status');
    }

    // Ensure all bundles have proper thumbnail URLs (use presigned URLs) and add purchase status
    const bundlesWithFixedThumbnails = await Promise.all(bundlesWithEnrollmentStatus.map(async (bundle) => {
      console.log(`🔍 [getAllBundles] Processing bundle: ${bundle.title} (ID: ${bundle._id})`);
      console.log(`   - Has thumbnailS3Key: ${!!bundle.thumbnailS3Key}`);
      console.log(`   - thumbnailS3Key: ${bundle.thumbnailS3Key || 'N/A'}`);
      console.log(`   - Current thumbnailURL: ${bundle.thumbnailURL || 'N/A'}`);
      
      if (bundle.thumbnailS3Key) {
        try {
          console.log(`   - Generating presigned URL for thumbnail...`);
          // Generate presigned URL for thumbnail (works without public access)
          bundle.thumbnailURL = await getThumbnailUrl(bundle.thumbnailS3Key);
          console.log(`   ✅ Generated presigned URL: ${bundle.thumbnailURL?.substring(0, 100)}...`);
        } catch (error) {
          console.error(`   ❌ Error generating thumbnail URL for bundle ${bundle._id}:`, error);
          // Fallback to public URL if presigned URL generation fails
          bundle.thumbnailURL = getPublicUrl(bundle.thumbnailS3Key);
          console.log(`   ⚠️  Using fallback public URL: ${bundle.thumbnailURL?.substring(0, 100)}...`);
        }
      } else {
        console.log(`   ⚠️  No thumbnailS3Key found for bundle ${bundle._id}`);
      }
      
      console.log(`   - Final thumbnailURL: ${bundle.thumbnailURL || 'N/A'}`);
      
      // Add purchase status (Udemy-style: show all bundles with purchase indicator)
      const bundleObj = bundle.toObject ? bundle.toObject() : bundle;
      bundleObj.isPurchased = purchasedBundleIds.includes(bundle._id.toString());
      
      return bundleObj;
    }));

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
      .limit(3);

    // Add hasReachedMaxEnrollments flag to each bundle
    const bundlesWithEnrollmentStatus = bundles.map(bundle => {
      const bundleObj = bundle.toObject();
      bundleObj.hasReachedMaxEnrollments = bundle.maxEnrollments 
        ? bundle.totalEnrollments >= bundle.maxEnrollments 
        : false;
      return bundleObj;
    });

    // Get user's purchased bundles to add purchase status (Udemy-style: show all bundles)
    let purchasedBundleIds = [];
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded && decoded.userId) {
          console.log('🔍 [getFeaturedBundles] User is logged in, checking purchase status');
          console.log('🔍 [getFeaturedBundles] User ID:', decoded.userId);
          
          // Get user's purchased bundles
          const User = require('../models/User');
          const user = await User.findById(decoded.userId);
          
          if (user && user.purchasedBundles && user.purchasedBundles.length > 0) {
            purchasedBundleIds = user.purchasedBundles.map(id => id.toString());
            console.log('🔍 [getFeaturedBundles] User has purchased bundles:', purchasedBundleIds);
          } else {
            console.log('🔍 [getFeaturedBundles] User has no purchased bundles');
          }
        }
      } catch (error) {
        console.log('🔍 [getFeaturedBundles] Invalid token, showing all bundles without purchase status');
      }
    } else {
      console.log('🔍 [getFeaturedBundles] No authentication token, showing all bundles without purchase status');
    }

    // Ensure all bundles have proper thumbnail URLs (use presigned URLs) and add purchase status
    const bundlesWithFixedThumbnails = await Promise.all(bundlesWithEnrollmentStatus.map(async (bundle) => {
      console.log(`🔍 [getFeaturedBundles] Processing bundle: ${bundle.title} (ID: ${bundle._id})`);
      console.log(`   - Has thumbnailS3Key: ${!!bundle.thumbnailS3Key}`);
      console.log(`   - thumbnailS3Key: ${bundle.thumbnailS3Key || 'N/A'}`);
      console.log(`   - Current thumbnailURL: ${bundle.thumbnailURL || 'N/A'}`);
      
      if (bundle.thumbnailS3Key) {
        try {
          console.log(`   - Generating presigned URL for thumbnail...`);
          // Generate presigned URL for thumbnail (works without public access)
          bundle.thumbnailURL = await getThumbnailUrl(bundle.thumbnailS3Key);
          console.log(`   ✅ Generated presigned URL: ${bundle.thumbnailURL?.substring(0, 100)}...`);
        } catch (error) {
          console.error(`   ❌ Error generating thumbnail URL for bundle ${bundle._id}:`, error);
          // Fallback to public URL if presigned URL generation fails
          bundle.thumbnailURL = getPublicUrl(bundle.thumbnailS3Key);
          console.log(`   ⚠️  Using fallback public URL: ${bundle.thumbnailURL?.substring(0, 100)}...`);
        }
      } else {
        console.log(`   ⚠️  No thumbnailS3Key found for bundle ${bundle._id}`);
      }
      
      console.log(`   - Final thumbnailURL: ${bundle.thumbnailURL || 'N/A'}`);
      
      // Add purchase status (Udemy-style: show all bundles with purchase indicator)
      const bundleObj = bundle.toObject ? bundle.toObject() : bundle;
      bundleObj.isPurchased = purchasedBundleIds.includes(bundle._id.toString());
      
      return bundleObj;
    }));

    console.log(`✅ [getFeaturedBundles] Returning ${bundlesWithFixedThumbnails.length} bundles with thumbnails`);
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
    let isPurchased = false;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded && decoded.userId) {
          const User = require('../models/User');
          const user = await User.findById(decoded.userId);
          
          if (user && user.purchasedBundles && user.purchasedBundles.length > 0) {
            const purchasedBundleIds = user.purchasedBundles.map(id => id.toString());
            isPurchased = purchasedBundleIds.includes(bundle._id.toString());
          }
          
          // Also check enrollment for backward compatibility
          const enrollment = bundle.getStudentEnrollment(decoded.userId);
          userHasPurchased = !!enrollment || isPurchased;
        }
      } catch (error) {
        // Invalid token, continue without user info
      }
    }

    // Populate course details
    await bundle.populate('courseIds', 'title description thumbnailURL price category level tags totalEnrollments videos');

    console.log(`🔍 [getBundleById] Processing bundle: ${bundle.title} (ID: ${bundle._id})`);
    console.log(`   - Has thumbnailS3Key: ${!!bundle.thumbnailS3Key}`);
    console.log(`   - thumbnailS3Key: ${bundle.thumbnailS3Key || 'N/A'}`);
    console.log(`   - Current thumbnailURL: ${bundle.thumbnailURL || 'N/A'}`);

    // Generate presigned URL for thumbnail if S3 key exists
    if (bundle.thumbnailS3Key) {
      try {
        console.log(`   - Generating presigned URL for thumbnail...`);
        // Generate presigned URL for thumbnail (works without public access)
        bundle.thumbnailURL = await getThumbnailUrl(bundle.thumbnailS3Key);
        console.log(`   ✅ Generated presigned URL: ${bundle.thumbnailURL?.substring(0, 100)}...`);
      } catch (error) {
        console.error(`   ❌ Error generating thumbnail URL for bundle ${bundle._id}:`, error);
        console.error(`   - Error details:`, error.message, error.stack);
        // Fallback to public URL if presigned URL generation fails
        bundle.thumbnailURL = getPublicUrl(bundle.thumbnailS3Key);
        console.log(`   ⚠️  Using fallback public URL: ${bundle.thumbnailURL?.substring(0, 100)}...`);
      }
    } else {
      console.log(`   ⚠️  No thumbnailS3Key found for bundle ${bundle._id}`);
    }
    
    console.log(`   - Final thumbnailURL: ${bundle.thumbnailURL || 'N/A'}`);

    // Add purchase status to bundle object (Udemy-style)
    const bundleObj = bundle.toObject ? bundle.toObject() : bundle;
    bundleObj.isPurchased = isPurchased;

    res.json({
      success: true,
      data: {
        bundle: bundleObj,
        userHasPurchased,
        isPurchased
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

    // IMPORTANT: Remove bundle reference from all users' purchasedBundles arrays
    // This prevents orphaned references, but students KEEP access to courses
    // because they're enrolled in courses directly (not just through the bundle)
    const updateResult = await User.updateMany(
      { purchasedBundles: { $in: [id] } },
      { $pull: { purchasedBundles: id } }
    );
    console.log(`✅ Removed bundle reference from ${updateResult.modifiedCount} users' purchased bundles`);
    console.log(`   - Note: Students still have access to courses (enrolled directly in courses)`);

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

    // Ensure all bundles have proper thumbnail URLs (use presigned URLs)
    const bundlesWithFixedThumbnails = await Promise.all(purchasedBundles.map(async (bundle) => {
      console.log(`🔍 [getUserPurchasedBundles] Processing bundle: ${bundle.title} (ID: ${bundle._id})`);
      console.log(`   - Has thumbnailS3Key: ${!!bundle.thumbnailS3Key}`);
      console.log(`   - thumbnailS3Key: ${bundle.thumbnailS3Key || 'N/A'}`);
      console.log(`   - Current thumbnailURL: ${bundle.thumbnailURL || 'N/A'}`);
      
      if (bundle.thumbnailS3Key) {
        try {
          console.log(`   - Generating presigned URL for thumbnail...`);
          // Generate presigned URL for thumbnail (works without public access)
          bundle.thumbnailURL = await getThumbnailUrl(bundle.thumbnailS3Key);
          console.log(`   ✅ Generated presigned URL: ${bundle.thumbnailURL?.substring(0, 100)}...`);
        } catch (error) {
          console.error(`   ❌ Error generating thumbnail URL for bundle ${bundle._id}:`, error);
          console.error(`   - Error details:`, error.message, error.stack);
          // Fallback to public URL if presigned URL generation fails
          bundle.thumbnailURL = getPublicUrl(bundle.thumbnailS3Key);
          console.log(`   ⚠️  Using fallback public URL: ${bundle.thumbnailURL?.substring(0, 100)}...`);
        }
      } else {
        console.log(`   ⚠️  No thumbnailS3Key found for bundle ${bundle._id}`);
      }
      
      console.log(`   - Final thumbnailURL: ${bundle.thumbnailURL || 'N/A'}`);
      return bundle;
    }));

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
