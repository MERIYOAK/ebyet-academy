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
    }
    
    const { courseId, order, version: requestedVersion } = req.body;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';
    

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
    
    const s3Key = `${S3_ROOT_PREFIX}/courses/${courseTitleString.replace(/[^a-zA-Z0-9\s-]/g, '_').replace(/\s+/g, '_')}/materials/${Date.now()}_${req.file.originalname}`;
    
    const s3UploadResult = await uploadToS3(req.file, s3Key);
    
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
      } catch (err) {
        console.error('âŒ [uploadMaterial] Error deleting temp file:', err);
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
    
    
    // Add material to course directly (no versioning)
    await Course.findByIdAndUpdate(courseId, {
      $push: { materials: material._id }
    });
    
    
    // Emit real-time update to connected users
    try {
      const socketService = getSocketService(req);
      if (socketService) {
        // Get course information for the broadcast
        const course = await Course.findById(material.courseId);
        const courseTitle = course ? (typeof course.title === 'string' ? course.title : course.title?.en || 'Course') : 'Course';
        
        socketService.broadcastContentUpdate('NEW_MATERIAL', {
          material: material,
          courseId: material.courseId,
          courseTitle: courseTitle,
          message: `New material "${material.title}" added to course`
        });
      }
    } catch (socketError) {
      console.warn('âš ï¸ [uploadMaterial] Failed to emit Socket.IO update:', socketError);
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
    console.error('âŒ [uploadMaterial] error:', error?.message || error);
    
    // Clean up temporary file on error
    if (req.file?.path) {
      try {
        require('fs').unlinkSync(req.file.path);
      } catch (err) {
        console.error('âŒ [uploadMaterial] Error deleting temp file on error:', err);
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
    

    // Debug: Check all materials for this course (regardless of version/status) - ALWAYS RUN
    const allMaterials = await Material.find({ courseId }).lean();

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
      hasPurchased = true; // Admins have access
    }

    // Get materials for the version (regardless of purchase status - show to all users)
    let materials = await Material.getByCourseVersion(courseId, versionNumber);

    // If no materials found for requested version, try version 1 as fallback
    if (materials.length === 0 && versionNumber !== 1) {
      materials = await Material.getByCourseVersion(courseId, 1);
    }

    // Generate signed URLs for each material (only for purchased users)
    const materialsWithUrls = await Promise.all(materials.map(async (material) => {
      let downloadUrl = null;
      
      // Only generate download URL if user has purchased
      if (hasPurchased) {
        try {
          // Generate presigned URL (valid for 1 hour)
          downloadUrl = await getSignedUrlForFile(material.s3Key, 3600, material.mimeType);
        } catch (error) {
          console.error(`âŒ Error generating URL for material ${material._id}:`, error);
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
    console.error('âŒ Get materials by course error:', error);
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
    const material = await Material.findById(req.params.materialId);
    if (!material) return res.status(404).json({ message: 'Material not found' });
    
    
    // Get course and course version BEFORE deleting
    const course = await Course.findById(material.courseId);
    const courseVersion = await CourseVersion.findOne({ 
      courseId: material.courseId, 
      versionNumber: material.courseVersion 
    });
    
    if (!courseVersion) {
      // If no course version found, this is an orphaned material
      // Still preserve the S3 file in case it's needed
      await Material.findByIdAndDelete(material._id);
      
      // Emit real-time update to connected users
      try {
        const socketService = getSocketService(req);
        if (socketService) {
          // Get course information for the broadcast
          const course = await Course.findById(material.courseId);
          const courseTitle = course ? (typeof course.title === 'string' ? course.title : course.title?.en || 'Course') : 'Course';
          
          socketService.broadcastContentUpdate('MATERIAL_DELETED', {
            materialId: material._id,
            material: material,
            courseId: material.courseId,
            courseTitle: courseTitle,
            message: `Material "${material.title}" deleted from course (orphaned)`
          });
        }
      } catch (socketError) {
        console.warn('âš ï¸ [deleteMaterial] Failed to emit Socket.IO update:', socketError);
      }
      
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
          // DO NOT delete from database or S3 - preserve for potential restoration
          
          // Emit real-time update to connected users
          try {
            const socketService = getSocketService(req);
            if (socketService) {
              // Get course information for the broadcast
              const course = await Course.findById(material.courseId);
              const courseTitle = course ? (typeof course.title === 'string' ? course.title : course.title?.en || 'Course') : 'Course';
              
              socketService.broadcastContentUpdate('MATERIAL_DELETED', {
                materialId: material._id,
                material: material,
                courseId: material.courseId,
                courseTitle: courseTitle,
                message: `Material "${material.title}" deleted from course (initial upload)`
              });
            }
          } catch (socketError) {
            console.warn('âš ï¸ [deleteMaterial] Failed to emit Socket.IO update:', socketError);
          }
          
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
        } else {
          newVersion.materials = [];
          await newVersion.save();
        }
        
        // Update statistics for the new version
        await newVersion.updateStatistics();
        
        // Update course to point to new version
        course.currentVersion = newVersionNumber;
        course.version = newVersionNumber;
        course.lastModifiedBy = adminEmail;
        await course.save();
        
        
        // Emit real-time update to connected users
        try {
          const socketService = getSocketService(req);
          if (socketService) {
            // Get course information for the broadcast
            const course = await Course.findById(material.courseId);
            const courseTitle = course ? (typeof course.title === 'string' ? course.title : course.title?.en || 'Course') : 'Course';
            
            socketService.broadcastContentUpdate('MATERIAL_DELETED', {
              materialId: material._id,
              material: material,
              courseId: material.courseId,
              courseTitle: courseTitle,
              message: `Material "${material.title}" deleted from course`
            });
          }
        } catch (socketError) {
          console.warn('âš ï¸ [deleteMaterial] Failed to emit Socket.IO update:', socketError);
        }
      // Material is in current version - we've already created a new version without it above
      // DO NOT delete the database record or S3 file - preserve for students with earlier versions
    } else {
      // Material is in an older version - DO NOT DELETE
      // Students with access to that version need this material
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

    // Emit real-time update to connected users
    try {
      const socketService = getSocketService(req);
      if (socketService) {
        // Get course information for the broadcast
        const course = await Course.findById(material.courseId);
        const courseTitle = course ? (typeof course.title === 'string' ? course.title : course.title?.en || 'Course') : 'Course';
        
        socketService.broadcastContentUpdate('MATERIAL_UPDATED', {
          material: material,
          courseId: material.courseId,
          courseTitle: courseTitle,
          message: `Material "${material.title}" updated in course`
        });
      }
    } catch (socketError) {
      console.warn('âš ï¸ [updateMaterial] Failed to emit Socket.IO update:', socketError);
    }
  } catch (err) {
    console.error('[updateMaterial] error:', err?.message || err);
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};
