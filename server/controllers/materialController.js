const Material = require('../models/Material');
const Course = require('../models/Course');
const CourseVersion = require('../models/CourseVersion');
const Video = require('../models/Video');
const { 
  uploadCourseFile, 
  getSignedUrlForFile, 
  deleteFileFromS3, 
  validateFile,
  getCourseFolderPath
} = require('../utils/s3CourseManager');
const { uploadToS3 } = require('../utils/s3');

// Get socket service from app
const getSocketService = (req) => {
  return req.app.get('socketService');
};

/**
 * Upload material for a course version
 */
exports.uploadMaterial = async (req, res) => {
  try {
    // Parse bilingual title and description if they come as JSON strings
    let title = req.body.title;
    let description = req.body.description || '';
    
    // Try to parse if they're JSON strings
    try {
      if (typeof title === 'string' && title.startsWith('{')) {
        title = JSON.parse(title);
      }
      if (typeof description === 'string' && description.startsWith('{')) {
        description = JSON.parse(description);
      }
    } catch (e) {
      // If parsing fails, treat as regular string (backward compatibility)
      console.log('[uploadMaterial] Title/description not JSON, using as string');
    }
    
    const { courseId, order, version: requestedVersion } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';
    
    console.log('[uploadMaterial] courseId:', req.body?.courseId, 'title:', title, 'size:', req.file?.size, 'file:', req.file?.originalname, 'requestedVersion:', requestedVersion);

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    if (!courseId) {
      return res.status(400).json({ 
        success: false,
        message: 'Course ID is required' 
      });
    }

    // Get course details for folder organization
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }

    // IMPORTANT: Always use the current version, not the requested version
    // This ensures we're always modifying the current version and creating a new one
    // Validate file size (max 100MB for materials)
    validateFile(req.file, [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
      'text/csv',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/json',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'audio/mpeg',
      'audio/mp3',
      'application/x-python-code',
      'text/x-python'
    ], 100 * 1024 * 1024); // 100MB max

    // Upload to S3
    const S3_ROOT_PREFIX = process.env.S3_ROOT_PREFIX || 'ibyet-investing-folder';
    const courseTitleString = typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || '');
    
    console.log(`📁 [uploadMaterial] Uploading to S3 with courseId: ${courseId}`);
    const s3Key = `${S3_ROOT_PREFIX}/courses/${courseTitleString.replace(/[^a-zA-Z0-9\s-]/g, '_').replace(/\s+/g, '_')}/materials/${Date.now()}_${req.file.originalname}`;
    console.log(`📁 [uploadMaterial] Generated S3 key: ${s3Key}`);
    
    const s3UploadResult = await uploadToS3(req.file, s3Key, 'private');
    
    const uploadResult = {
      success: true,
      s3Key,
      url: s3UploadResult.Location,
      etag: s3UploadResult.ETag
    };

    // Clean up temporary file
    if (req.file.path) {
      try {
        require('fs').unlinkSync(req.file.path);
        console.log('🧹 [uploadMaterial] Temporary file cleaned up:', req.file.path);
      } catch (err) {
        console.error('❌ [uploadMaterial] Error deleting temp file:', err);
      }
    }

    // Get file extension
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase() || '';

    // Create material record (no versioning)
    const material = await Material.create({ 
      title: title || req.file.originalname, 
      description: description || '',
      s3Key: uploadResult.s3Key, 
      courseId, 
      order: order ? parseInt(order) : 0,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      fileExtension: fileExtension,
      uploadedBy: adminEmail,
      status: 'active'
    });
    
    console.log(`✅ [uploadMaterial] Material created: ${material._id}`);
    
    // Add material to course directly (no versioning)
    await Course.findByIdAndUpdate(courseId, {
      $push: { materials: material._id }
    });
    
    console.log(`✅ [uploadMaterial] Material added to course ${courseId}`);
    
    // Emit Socket.IO event for real-time update
    const socketService = getSocketService(req);
    if (socketService) {
      socketService.notifyCourseMaterialsUpdated({
        id: course._id,
        title: course.title,
        material: {
          id: material._id,
          title: material.title,
          description: material.description,
          order: material.order,
          fileSize: material.fileSize,
          mimeType: material.mimeType,
          originalName: material.originalName
        }
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Material uploaded successfully',
      data: {
        material: {
          id: material._id,
          title: material.title,
          description: material.description,
          s3Key: material.s3Key,
          order: material.order,
          fileSize: material.fileSize,
          mimeType: material.mimeType,
          originalName: material.originalName
        }
      }
    });
  } catch (error) {
    console.error('❌ [uploadMaterial] error:', error?.message || error);
    
    // Clean up temporary file on error
    if (req.file?.path) {
      try {
        require('fs').unlinkSync(req.file.path);
        console.log('🧹 [uploadMaterial] Temporary file cleaned up on error:', req.file.path);
      } catch (err) {
        console.error('❌ [uploadMaterial] Error deleting temp file on error:', err);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload material', 
      error: error.message 
    });
  }
};

/**
 * Get materials for a course version (with purchase check)
 */
exports.getMaterialsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { version } = req.query;
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const isAdmin = req.admin || req.user?.role === 'admin';

    console.log(`🔧 [getMaterialsByCourse] Request details:`, {
      courseId,
      version: version || 'current',
      userId: userId || 'public',
      isAdmin: isAdmin,
      hasUser: !!req.user,
      userObject: req.user ? { id: req.user.id, _id: req.user._id, userId: req.user.userId } : null,
      authHeader: req.header('Authorization') ? 'present' : 'missing'
    });

    // Get course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Determine which version to fetch
    const versionNumber = version ? parseInt(version) : (course.currentVersion || 1);
    
    console.log(`📋 Version determination:`, {
      versionFromQuery: version,
      courseCurrentVersion: course.currentVersion,
      versionNumberUsed: versionNumber,
      courseId
    });

    // Debug: Check all materials for this course (regardless of version/status) - ALWAYS RUN
    const allMaterials = await Material.find({ courseId }).lean();
    console.log(`🔍 [DEBUG] All materials for course ${courseId}:`, {
      totalMaterials: allMaterials.length,
      byVersion: allMaterials.reduce((acc, m) => {
        const v = m.courseVersion || 'unknown';
        acc[v] = (acc[v] || 0) + 1;
        return acc;
      }, {}),
      byStatus: allMaterials.reduce((acc, m) => {
        const s = m.status || 'unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {}),
      materials: allMaterials.map(m => ({
        id: m._id,
        title: m.title,
        courseVersion: m.courseVersion,
        status: m.status
      }))
    });

    // Check if user has purchased the course (unless admin)
    let hasPurchased = false;
    if (!isAdmin) {
      if (!userId) {
        // Unauthenticated user - show materials but without download URLs
        hasPurchased = false;
      } else {
        // Check purchase status
        const { userHasPurchased } = require('../utils/purchaseUtils');
        hasPurchased = await userHasPurchased(userId, courseId);
      }
    } else {
      // Admin access - log for debugging
      console.log(`🔧 [getMaterialsByCourse] Admin access granted for course ${courseId}`);
      hasPurchased = true; // Admins have access
    }

    // Get materials for the version (regardless of purchase status - show to all users)
    let materials = await Material.getByCourseVersion(courseId, versionNumber);

    // If no materials found for requested version, try version 1 as fallback
    if (materials.length === 0 && versionNumber !== 1) {
      console.log(`⚠️ No materials found for version ${versionNumber}, trying version 1 as fallback`);
      materials = await Material.getByCourseVersion(courseId, 1);
      console.log(`📊 Fallback: Found ${materials.length} materials in version 1`);
    }

    console.log(`📊 Found ${materials.length} materials for course ${courseId}, version ${versionNumber}`, {
      materials: materials.map(m => ({
        id: m._id,
        title: m.title,
        courseVersion: m.courseVersion,
        status: m.status
      }))
    });

    // Generate signed URLs for each material (only for purchased users)
    const materialsWithUrls = await Promise.all(materials.map(async (material) => {
      let downloadUrl = null;
      
      // Only generate download URL if user has purchased
      if (hasPurchased) {
        try {
          // Generate presigned URL (valid for 1 hour)
          downloadUrl = await getSignedUrlForFile(material.s3Key, 3600, material.mimeType);
        } catch (error) {
          console.error(`❌ Error generating URL for material ${material._id}:`, error);
        }
      }
      
      return {
        id: material._id,
        title: material.title,
        description: material.description,
        downloadUrl: downloadUrl, // null for unpurchased users
        fileSize: material.fileSize,
        fileExtension: material.fileExtension,
        mimeType: material.mimeType,
        originalName: material.originalName,
        order: material.order,
        uploadedBy: material.uploadedBy,
        createdAt: material.createdAt,
        fileType: material.getFileType(),
        formattedSize: material.getFormattedSize()
      };
    }));

    res.json({
      success: true,
      data: {
        materials: materialsWithUrls,
        courseId,
        version: versionNumber
      }
    });
  } catch (error) {
    console.error('❌ Get materials by course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch materials',
      error: error.message
    });
  }
};

/**
 * Delete material
 */
exports.deleteMaterial = async (req, res) => {
  try {
    console.log('[deleteMaterial] materialId:', req.params.materialId);
    const material = await Material.findById(req.params.materialId);
    if (!material) return res.status(404).json({ message: 'Material not found' });
    
    console.log(`🗑️ [deleteMaterial] Starting deletion of material: ${material.title}`);
    
    // Get course and course version BEFORE deleting
    const course = await Course.findById(material.courseId);
    const courseVersion = await CourseVersion.findOne({ 
      courseId: material.courseId, 
      versionNumber: material.courseVersion 
    });
    
    if (!courseVersion) {
      console.log(`⚠️ [deleteMaterial] CourseVersion not found for version ${material.courseVersion}`);
      // If no course version found, this is an orphaned material
      // Still preserve the S3 file in case it's needed
      console.log(`🔒 [deleteMaterial] CourseVersion not found, but preserving S3 file. Only removing database record.`);
      await Material.findByIdAndDelete(material._id);
      return res.json({ 
        success: true,
        message: 'Material database record removed. S3 file preserved.',
        data: { materialId: material._id }
      });
    }
    
    // Check if we need to create a new version BEFORE deleting
    // Get the current version number (handle undefined cases)
    const courseCurrentVersion = course.currentVersion || course.version || 1;
    
    if (course && courseCurrentVersion === material.courseVersion) {
        // Check if this is initial upload (course has no enrollments)
        // During initial upload, deletions stay in version 1
        // After enrollments exist, deletions create new versions
        const hasEnrollments = course.enrolledStudents && course.enrolledStudents.length > 0;
        const isInitialUpload = !hasEnrollments;
        
        if (isInitialUpload) {
          // Initial upload: Just remove from version 1, don't create new version
          console.log(`📝 [deleteMaterial] Initial upload mode: Removing material from version 1 (no enrollments yet)`);
          // DO NOT delete from database or S3 - preserve for potential restoration
          console.log(`🔒 [deleteMaterial] Material database record and S3 file preserved`);
          return res.json({
            success: true,
            message: 'Material removed from version 1 during initial upload. File preserved.',
            data: {
              materialId: material._id,
              removedFromVersion: 1,
              s3FilePreserved: true
            }
          });
        }
        
        // Course has enrollments: Create new version without this material
        console.log(`🔄 [deleteMaterial] Deleting material from current version, creating new version (course has ${course.enrolledStudents.length} enrollments)...`);
        
        const latestVersion = await CourseVersion.findOne({ 
          courseId: material.courseId 
        }).sort({ versionNumber: -1 });
        
        // If latestVersion exists, increment it. Otherwise, use current version + 1
        const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : (material.courseVersion + 1);
        const adminEmail = req.admin?.email || req.user?.email || 'admin';
        
        // Get existing videos for the current version
        const existingVideos = await Video.find({ 
          courseId: material.courseId, 
          courseVersion: material.courseVersion,
          status: { $ne: 'deleted' }
        });
        
        // Create new version
        const newVersion = new CourseVersion({
          courseId: material.courseId,
          versionNumber: newVersionNumber,
          title: courseVersion.title,
          description: courseVersion.description,
          price: courseVersion.price,
          category: courseVersion.category,
          level: courseVersion.level,
          thumbnailURL: courseVersion.thumbnailURL,
          thumbnailS3Key: courseVersion.thumbnailS3Key,
          s3FolderPath: getCourseFolderPath(typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || ''), newVersionNumber),
          createdBy: adminEmail,
          changeLog: `Version ${newVersionNumber} created: Material removed`,
          videos: [], // Will be populated after copying videos
          materials: [], // Will be populated after copying materials
          status: courseVersion.status,
          isPublic: courseVersion.isPublic
        });
        
        await newVersion.save();
        
        // Copy existing videos to the new version
        if (existingVideos.length > 0) {
          console.log(`🎬 [deleteMaterial] Copying ${existingVideos.length} videos to new version v${newVersionNumber}...`);
          const videoCopyPromises = existingVideos.map(v => {
            return Video.create({
              title: v.title,
              description: v.description,
              s3Key: v.s3Key,
              courseId: v.courseId,
              courseVersion: newVersionNumber,
              duration: v.duration,
              order: v.order,
              fileSize: v.fileSize,
              mimeType: v.mimeType,
              originalName: v.originalName,
              uploadedBy: v.uploadedBy,
              isFreePreview: v.isFreePreview || false,
              status: v.status || 'active'
            });
          });
          const copiedVideos = await Promise.all(videoCopyPromises);
          // Update the new version's videos array with the copied video IDs
          newVersion.videos = copiedVideos.map(v => v._id);
          await newVersion.save();
          console.log(`✅ [deleteMaterial] Copied ${copiedVideos.length} videos to version v${newVersionNumber}`);
        }
        
        // Copy existing materials to the new version (excluding the one being deleted)
        // IMPORTANT: Get materials BEFORE deleting from database
        const existingMaterials = await Material.find({ 
          courseId: material.courseId, 
          courseVersion: material.courseVersion,
          status: 'active',
          _id: { $ne: material._id } // Exclude the material being deleted
        });
        
        if (existingMaterials.length > 0) {
          console.log(`📦 [deleteMaterial] Copying ${existingMaterials.length} materials to new version v${newVersionNumber}...`);
          const materialUpdatePromises = existingMaterials.map(mat => {
            // Create a new material record for the new version
            return Material.create({
              title: mat.title,
              description: mat.description,
              s3Key: mat.s3Key, // Same S3 file, just new database record
              courseId: mat.courseId,
              courseVersion: newVersionNumber, // New version
              order: mat.order,
              fileSize: mat.fileSize,
              mimeType: mat.mimeType,
              originalName: mat.originalName,
              fileExtension: mat.fileExtension,
              uploadedBy: mat.uploadedBy,
              status: 'active'
            });
          });
          const copiedMaterials = await Promise.all(materialUpdatePromises);
          // Update the new version's materials array with the copied material IDs
          newVersion.materials = copiedMaterials.map(m => m._id);
          await newVersion.save();
          console.log(`✅ [deleteMaterial] Copied ${copiedMaterials.length} materials to version v${newVersionNumber}`);
        } else {
          newVersion.materials = [];
          await newVersion.save();
          console.log(`📝 [deleteMaterial] No remaining materials to copy to new version v${newVersionNumber}`);
        }
        
        // Update statistics for the new version
        await newVersion.updateStatistics();
        console.log(`📊 [deleteMaterial] Statistics updated for version v${newVersionNumber}`);
        
        // Update course to point to new version
        course.currentVersion = newVersionNumber;
        course.version = newVersionNumber;
        course.lastModifiedBy = adminEmail;
        await course.save();
        
        console.log(`✅ [deleteMaterial] Created new version v${newVersionNumber} and set as current`);
    }
    
    // CRITICAL: DO NOT delete the database record or S3 file!
    // The material must remain accessible for students who purchased earlier versions.
    // We've already created a new version without this material above (if it was in current version).
    // The old version still has the reference, so students with access to that version can still access the file.
    
    if (material.courseVersion === courseCurrentVersion) {
      // Material is in current version - we've already created a new version without it above
      // DO NOT delete the database record or S3 file - preserve for students with earlier versions
      console.log(`🔒 [deleteMaterial] Material database record and S3 file preserved for students with earlier versions`);
      console.log(`   Material removed from version ${courseCurrentVersion}, but still accessible in version ${material.courseVersion}`);
    } else {
      // Material is in an older version - DO NOT DELETE
      // Students with access to that version need this material
      console.log(`⚠️ [deleteMaterial] Material is in version ${material.courseVersion}, but current version is ${courseCurrentVersion}`);
      console.log(`   Keeping material for students who purchased version ${material.courseVersion}`);
    }
    
    res.json({ 
      success: true,
      message: material.courseVersion === courseCurrentVersion 
        ? 'Material removed from current version. File preserved for students with earlier versions.'
        : 'Material is in an older version and cannot be deleted. Students with access to that version need this material.',
      data: {
        materialId: material._id,
        removedFromVersion: material.courseVersion === courseCurrentVersion ? courseCurrentVersion : null,
        stillAvailableInVersion: material.courseVersion,
        s3FilePreserved: true
      }
    });
  } catch (err) {
    console.error('[deleteMaterial] error:', err?.message || err);
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};

/**
 * Update material metadata (title, description, order)
 * NOTE: This does NOT create a new version - only adding/deleting materials triggers version increments
 */
exports.updateMaterial = async (req, res) => {
  try {
    console.log('[updateMaterial] materialId:', req.params.materialId);
    const material = await Material.findById(req.params.materialId);
    if (!material) return res.status(404).json({ message: 'Material not found' });
    
    // Parse bilingual title and description if they come as JSON strings
    let title = req.body.title;
    let description = req.body.description;
    
    // Try to parse if they're JSON strings
    try {
      if (title && typeof title === 'string' && title.startsWith('{')) {
        title = JSON.parse(title);
      }
      if (description !== undefined && typeof description === 'string' && description.startsWith('{')) {
        description = JSON.parse(description);
      }
    } catch (e) {
      // If parsing fails, treat as regular string (backward compatibility)
      console.log('[updateMaterial] Title/description not JSON, using as string');
    }
    
    // Update material fields
    if (title !== undefined) {
      material.title = title;
    }
    if (description !== undefined) {
      material.description = description;
    }
    if (req.body.order !== undefined) {
      material.order = parseInt(req.body.order);
    }
    
    await material.save();
    
    // Emit Socket.IO event for real-time update
    const socketService = getSocketService(req);
    if (socketService) {
      socketService.notifyCourseMaterialsUpdated({
        id: material.courseId,
        title: material.title,
        material: {
          id: material._id,
          title: material.title,
          description: material.description,
          order: material.order,
          fileSize: material.fileSize,
          mimeType: material.mimeType,
          originalName: material.originalName
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Material updated successfully',
      data: {
        material
      }
    });
  } catch (err) {
    console.error('[updateMaterial] error:', err?.message || err);
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

