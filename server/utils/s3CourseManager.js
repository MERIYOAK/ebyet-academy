const { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const S3_ROOT_PREFIX = process.env.S3_ROOT_PREFIX || 'ibyet-investing-folder';

// Initialize S3 client
const createS3Client = () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET;

  if (!accessKeyId || !secretAccessKey || !bucket) {
    console.log('❌ Missing AWS credentials');
    return null;
  }

  try {
    return new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      maxAttempts: 3
    });
  } catch (error) {
    console.error('❌ Failed to create S3 client:', error);
    return null;
  }
};

const s3Client = createS3Client();

/**
 * Generate course folder path for versioning
 */
const getCourseFolderPath = (courseName, version = 1) => {
  const sanitizedCourseName = courseName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${S3_ROOT_PREFIX}/courses/${sanitizedCourseName}/v${version}`;
};

/**
 * Generate archive folder path
 */
const getArchiveFolderPath = (courseName, version = 1) => {
  const sanitizedCourseName = courseName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${S3_ROOT_PREFIX}/archived-courses/${sanitizedCourseName}/v${version}`;
};

/**
 * Generate S3 key for course files
 */
const generateCourseFileKey = (fileType, fileName, courseName, version = 1) => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const sanitizedCourseName = courseName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  switch (fileType) {
    case 'thumbnail':
      return `${S3_ROOT_PREFIX}/courses/${sanitizedCourseName}/v${version}/thumbnails/${timestamp}_${sanitizedFileName}`;
    case 'video':
      return `${S3_ROOT_PREFIX}/courses/${sanitizedCourseName}/v${version}/videos/${timestamp}_${sanitizedFileName}`;
    case 'material':
      return `${S3_ROOT_PREFIX}/courses/${sanitizedCourseName}/v${version}/materials/${timestamp}_${sanitizedFileName}`;
    default:
      return `${S3_ROOT_PREFIX}/courses/${sanitizedCourseName}/v${version}/misc/${timestamp}_${sanitizedFileName}`;
  }
};

/**
 * Upload course file to S3
 */
const uploadCourseFile = async (file, fileType, courseName, version = 1) => {
  if (!s3Client) {
    throw new Error('S3 client not available');
  }

  try {
    console.log('🔧 [S3] Starting upload process...');
    const s3Key = generateCourseFileKey(fileType, file.originalname, courseName, version);
    // Generated S3 key
    
    // Sanitize course name for metadata (remove invalid characters for HTTP headers)
    const sanitizedCourseName = courseName.replace(/[^a-zA-Z0-9\s-]/g, '_').replace(/\s+/g, '_');
    console.log('🔧 [S3] Sanitized course name:', sanitizedCourseName);
    
    // Create file stream with proper error handling
    let fileStream;
    if (file.path) {
      const fs = require('fs');
      fileStream = fs.createReadStream(file.path);
      
      // Add error handling for the stream
      fileStream.on('error', (error) => {
        console.error('🔧 [S3] File stream error:', error);
      });
    }

    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: fileStream || file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        courseName: sanitizedCourseName,
        version: version.toString(),
        fileType,
        uploadedAt: new Date().toISOString()
      }
    };

    console.log('🔧 [S3] Upload params prepared, body type:', file.path ? 'file stream' : 'buffer');
    console.log('🔧 [S3] Sending to S3...');
    
    const command = new PutObjectCommand(uploadParams);
    console.log('🔧 [S3] Command created, starting upload...');
    
    // Add timeout to the S3 command
    const result = await Promise.race([
      s3Client.send(command).then((res) => {
        console.log('🔧 [S3] S3 send() completed, result:', res.ETag);
        return res;
      }),
      new Promise((_, reject) => 
        setTimeout(() => {
          console.log('🔧 [S3] S3 upload timeout after 5 minutes');
          reject(new Error('S3 upload timeout after 5 minutes'));
        }, 5 * 60 * 1000)
      )
    ]);
    
    console.log('🔧 [S3] S3 upload completed successfully');
    
    // Close the file stream if it was created
    if (fileStream) {
      fileStream.destroy();
    }

    return {
      success: true,
      s3Key,
      url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
      etag: result.ETag
    };
  } catch (error) {
    console.error('Upload failed:', error);
    
    // Close the file stream if it was created and there was an error
    if (fileStream) {
      fileStream.destroy();
    }
    
    throw new Error(`Failed to upload ${fileType}: ${error.message}`);
  }
};

/**
 * Archive course content
 */
const archiveCourseContent = async (courseName, version = 1) => {
  if (!s3Client) {
    throw new Error('S3 client not available');
  }

  try {
    const sourceFolder = getCourseFolderPath(courseName, version);
    const archiveFolder = getArchiveFolderPath(courseName, version);
    
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
      
      const copyCommand = new CopyObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        CopySource: `${process.env.AWS_S3_BUCKET}/${sourceKey}`,
        Key: destinationKey
      });
      
      return s3Client.send(copyCommand);
    });
    
    await Promise.all(copyPromises);
    
    return {
      success: true,
      archivedCount: listResult.Contents.length
    };
    
  } catch (error) {
    console.error('Archive failed:', error);
    throw new Error(`Failed to archive course content: ${error.message}`);
  }
};

/**
 * Get signed URL for file access with enhanced security
 */
const getSignedUrlForFile = async (s3Key, expiresIn = 3600, mimeType = null) => {
  if (!s3Client) {
    return null;
  }

  try {
    // Generating secure signed URL
    console.log('🔐 [S3] MIME type:', mimeType || 'not specified');
    
    const commandParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      // Add security headers to prevent downloads
      ResponseContentDisposition: 'inline', // Prevents download dialog
      // Add referer restriction (optional - uncomment if you want to restrict by domain)
      // ResponseCacheControl: 'no-cache, no-store, must-revalidate',
    };
    
    // Don't force ResponseContentType - let S3 serve the file with its original content type
    // This prevents issues where the forced content type doesn't match the actual file format
    console.log('🔐 [S3] Not forcing content type - letting S3 serve with original MIME type');
    
    const command = new GetObjectCommand(commandParams);
    
    const signedUrl = await getSignedUrl(s3Client, command, { 
      expiresIn,
      // Add additional security options
      signableHeaders: new Set(['host']), // Only sign host header
    });

    console.log('✅ [S3] Secure signed URL generated successfully');
    return signedUrl;
  } catch (error) {
    console.error('❌ [S3] Error generating signed URL:', error);
    return null;
  }
};

/**
 * Delete file from S3
 */
const deleteFileFromS3 = async (s3Key) => {
  if (!s3Client) {
    return { success: false, error: 'S3 not configured' };
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key
    });
    
    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error('Delete failed:', error);
    return { success: false, error: error.message };
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
    throw new Error(`File type ${file.mimetype} not allowed`);
  }
  
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    throw new Error(`File size exceeds maximum allowed size of ${maxSizeMB} MB`);
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
 * List files in course version
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
    console.error('Failed to list course files:', error);
    return [];
  }
};

module.exports = {
  uploadCourseFile,
  archiveCourseContent,
  getSignedUrlForFile,
  deleteFileFromS3,
  validateFile,
  getPublicUrl,
  getCourseFolderPath,
  getArchiveFolderPath,
  generateCourseFileKey,
  listCourseVersionFiles
}; 