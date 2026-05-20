const { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const S3_ROOT_PREFIX = process.env.S3_ROOT_PREFIX || 'ibyet-investing-folder';

// Initialize S3 client with AWS SDK v3 and better error handling
const createS3Client = () => {
  
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET;


  // Validate required environment variables
  if (!accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  try {
    const client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Add retry configuration
      maxAttempts: 3,
      requestHandler: {
        httpOptions: {
          timeout: 30000, // 30 seconds
        }
      }
    });
    return client;
  } catch (error) {
    console.error('âŒ Failed to create S3 client:', error);
    return null;
  }
};

const s3Client = createS3Client();

/**
 * Generate S3 key with proper organization for course versioning
 */
const generateS3Key = (fileType, fileName, context = {}) => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  let key;
  switch (fileType) {
    case 'profile-pic':
      key = `${S3_ROOT_PREFIX}/profile-pics/${timestamp}_${sanitizedFileName}`;
      break;
    case 'thumbnail':
      // Thumbnails are NON-VERSIONED (shared across all versions)
      // Version parameter is ignored - stored at: courses/{courseName}/thumbnails/
      const { courseName } = context;
      const sanitizedCourseName = (courseName || 'unknown-course').replace(/[^a-zA-Z0-9.-]/g, '_');
      key = `${S3_ROOT_PREFIX}/courses/${sanitizedCourseName}/thumbnails/${timestamp}_${sanitizedFileName}`;
      break;
    case 'course-video':
      const { courseName: videoCourseName, version: videoVersion = 1 } = context;
      const sanitizedVideoCourseName = (videoCourseName || 'unknown-course').replace(/[^a-zA-Z0-9.-]/g, '_');
      key = `${S3_ROOT_PREFIX}/courses/${sanitizedVideoCourseName}/v${videoVersion}/videos/${timestamp}_${sanitizedFileName}`;
      break;
    case 'course-material':
      const { courseName: materialCourseName, version: materialVersion = 1 } = context;
      const sanitizedMaterialCourseName = (materialCourseName || 'unknown-course').replace(/[^a-zA-Z0-9.-]/g, '_');
      key = `${S3_ROOT_PREFIX}/courses/${sanitizedMaterialCourseName}/v${materialVersion}/materials/${timestamp}_${sanitizedFileName}`;
      break;
    case 'bundle-thumbnails':
      // Bundle thumbnails go in bundles/thumbnails/ folder
      // Context can be an object with bundleIdentifier, bundleId, or slug
      let bundleIdentifier = sanitizedFileName;
      if (context) {
        if (context.bundleIdentifier) {
          bundleIdentifier = String(context.bundleIdentifier).replace(/[^a-zA-Z0-9.-]/g, '_');
        } else if (context.bundleId || context.slug) {
          bundleIdentifier = (context.bundleId || context.slug).toString().replace(/[^a-zA-Z0-9.-]/g, '_');
        }
      }
      key = `${S3_ROOT_PREFIX}/bundles/thumbnails/${timestamp}_${bundleIdentifier}`;
      break;
    default:
      key = `${S3_ROOT_PREFIX}/misc/${timestamp}_${sanitizedFileName}`;
  }
  
  return key;
};

/**
 * Generate course folder path for versioning
 */
const getCourseFolderPath = (courseName, version = 1) => {
  // Extract string from bilingual object or use string directly
  let courseNameString = courseName;
  if (typeof courseName === 'object' && courseName !== null) {
    courseNameString = courseName.en || courseName.tg || 'course';
  }
  if (typeof courseNameString !== 'string') {
    courseNameString = String(courseNameString);
  }
  const sanitizedCourseName = courseNameString.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${S3_ROOT_PREFIX}/courses/${sanitizedCourseName}/v${version}`;
};

/**
 * Generate archive folder path
 * Handles both string and bilingual object {en, tg} inputs
 */
const getArchiveFolderPath = (courseName, version = 1) => {
  // Extract string from bilingual object or use string directly
  let courseNameString = courseName;
  if (typeof courseName === 'object' && courseName !== null) {
    courseNameString = courseName.en || courseName.tg || 'course';
  }
  if (typeof courseNameString !== 'string') {
    courseNameString = String(courseNameString);
  }
  const sanitizedCourseName = courseNameString.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${S3_ROOT_PREFIX}/archived-courses/${sanitizedCourseName}/v${version}`;
};

/**
 * Upload file to S3 with proper organization and fallback
 */
const uploadToS3 = async (file, fileType, context = {}) => {
  
  // Check if S3 is available
  if (!s3Client) {
    return {
      success: false,
      error: 'S3 not configured',
      isLocal: true,
      localPath: `./uploads/${file.originalname}`
    };
  }

  try {
  const s3Key = generateS3Key(fileType, file.originalname, context);
    // Generated S3 key
  
  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3Key,
    Body: file.buffer,
    ContentType: file.mimetype,
    Metadata: {
      originalName: file.originalname,
      uploadedAt: new Date().toISOString(),
      fileType: fileType,
        ...context
      }
    };

    const command = new PutObjectCommand(uploadParams);
    const result = await s3Client.send(command);
    

    return {
      success: true,
      s3Key: s3Key,
      url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
      publicUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
      etag: result.ETag,
      versionId: result.VersionId,
      isLocal: false
    };

  } catch (error) {
    console.error('âŒ S3 upload failed:', error);
    return {
      success: false,
      error: error.message,
      isLocal: true,
      localPath: `./uploads/${file.originalname}`
    };
  }
};

/**
 * Delete file from S3
 */
const deleteFromS3 = async (s3Key) => {
  if (!s3Client) {
    return { success: false, error: 'S3 not configured' };
  }

  try {
    // Deleting from S3
    
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key
    });
    
    const result = await s3Client.send(command);
    
    return { success: true, result };
  } catch (error) {
    console.error('âŒ S3 delete failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Copy file in S3 (for archiving)
 */
const copyInS3 = async (sourceKey, destinationKey) => {
  if (!s3Client) {
    return { success: false, error: 'S3 not configured' };
  }

  try {
    
    const command = new CopyObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      CopySource: `${process.env.AWS_S3_BUCKET}/${sourceKey}`,
      Key: destinationKey
    });
    
    const result = await s3Client.send(command);
    
    return { success: true, result };
  } catch (error) {
    console.error('âŒ S3 copy failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Archive course content to archived-courses folder
 */
const archiveCourseContent = async (courseName, version = 1) => {
  
  const sourceFolder = getCourseFolderPath(courseName, version);
  const archiveFolder = getArchiveFolderPath(courseName, version);
  
  try {
    // List all objects in the course folder
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: sourceFolder
    });
    
    const listResult = await s3Client.send(listCommand);
    
    if (!listResult.Contents || listResult.Contents.length === 0) {
      return { success: true, archivedCount: 0 };
    }
    
    
    // Copy each object to archive location
    const copyPromises = listResult.Contents.map(async (object) => {
      const sourceKey = object.Key;
      const destinationKey = sourceKey.replace(sourceFolder, archiveFolder);
      
      return copyInS3(sourceKey, destinationKey);
    });
    
    const copyResults = await Promise.all(copyPromises);
    const successfulCopies = copyResults.filter(result => result.success);
    
    
    return {
      success: true,
      archivedCount: successfulCopies.length,
      totalCount: listResult.Contents.length
    };
    
  } catch (error) {
    console.error('âŒ Archive operation failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get signed URL for file access
 */
const getSignedUrlForFile = async (s3Key, expiresIn = 3600) => {
  if (!s3Client) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('âŒ Failed to generate signed URL:', error);
    return null;
  }
};

/**
 * Validate file before upload
 */
const validateFile = (file, allowedTypes, maxSize) => {
  if (!file) {
    throw new Error('No file provided');
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    throw new Error(`File size ${file.size} bytes exceeds maximum allowed size of ${maxSizeMB} MB`);
  }
  
  return true;
};

/**
 * Get public URL for file
 */
const getPublicUrl = (s3Key) => {
  if (!s3Key) return null;
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
};

/**
 * Get thumbnail public URL
 */
const getThumbnailPublicUrl = (s3Key) => {
  return getPublicUrl(s3Key);
};

/**
 * Make thumbnail publicly accessible
 */
const makeThumbnailPublic = async (s3Key) => {
  if (!s3Client) {
    return false;
  }

  try {
    // For thumbnails, we typically want them to be publicly accessible
    // This would require setting the object ACL to public-read
    // However, this depends on your S3 bucket configuration
    
    // Making thumbnail publicly accessible
    return true;
  } catch (error) {
    console.error('âŒ Failed to make thumbnail public:', error);
    return false;
  }
};

/**
 * List all files in a course version
 */
const listCourseVersionFiles = async (courseName, version = 1) => {
  if (!s3Client) {
    return [];
  }

  try {
    const folderPath = getCourseFolderPath(courseName, version);
    
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: folderPath
    });
    
    const result = await s3Client.send(command);
    return result.Contents || [];
  } catch (error) {
    console.error('âŒ Failed to list course files:', error);
    return [];
  }
};

/**
 * Clean up old archived content (past grace period)
 */
const cleanupOldArchivedContent = async (gracePeriodMonths = 6) => {
  
  if (!s3Client) {
    return { success: false, error: 'S3 not configured' };
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - gracePeriodMonths);
    
    // List all archived content
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: `${S3_ROOT_PREFIX}/archived-courses/`
    });
    
    const result = await s3Client.send(command);
    
    if (!result.Contents || result.Contents.length === 0) {
      return { success: true, deletedCount: 0 };
    }
    
    // Filter objects older than grace period
    const oldObjects = result.Contents.filter(object => {
      return object.LastModified < cutoffDate;
    });
    
    if (oldObjects.length === 0) {
      return { success: true, deletedCount: 0 };
    }
    
    
    // Delete old objects
    const deletePromises = oldObjects.map(async (object) => {
      return deleteFromS3(object.Key);
    });
    
    const deleteResults = await Promise.all(deletePromises);
    const successfulDeletes = deleteResults.filter(result => result.success);
    
    
    return {
      success: true,
      deletedCount: successfulDeletes.length,
      totalCount: oldObjects.length
    };
    
  } catch (error) {
    console.error('âŒ Cleanup failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  s3Client,
  uploadToS3,
  deleteFromS3,
  copyInS3,
  archiveCourseContent,
  getSignedUrlForFile,
  validateFile,
  getPublicUrl,
  getThumbnailPublicUrl,
  makeThumbnailPublic,
  getCourseFolderPath,
  getArchiveFolderPath,
  listCourseVersionFiles,
  cleanupOldArchivedContent,
  generateS3Key
}; 