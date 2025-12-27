const AWS = require('aws-sdk');

const S3_ROOT_PREFIX = process.env.S3_ROOT_PREFIX || 'ibyet-investing-folder';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  signatureVersion: 'v4',
});

const getSignedUrl = (key, expiresIn = 60 * 5) => {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Expires: expiresIn,
  });
};

const uploadToS3 = (file, key, acl = 'private') => {
  const fs = require('fs');
  
  console.log('🔧 [uploadToS3] Starting upload...');
  console.log('🔧 [uploadToS3] File path:', file.path);
  console.log('🔧 [uploadToS3] File size:', file.size);
  console.log('🔧 [uploadToS3] S3 Key:', key);
  console.log('🔧 [uploadToS3] Bucket:', process.env.AWS_S3_BUCKET);
  
  return new Promise((resolve, reject) => {
    let fileStream;
    
    try {
      // Create file stream with error handling
      if (file.path) {
        console.log('🔧 [uploadToS3] Creating file stream from path...');
        fileStream = fs.createReadStream(file.path);
        
        fileStream.on('error', (error) => {
          console.error('🔧 [uploadToS3] File stream error:', error);
          reject(error);
        });
        
        fileStream.on('open', () => {
          console.log('🔧 [uploadToS3] File stream opened successfully');
        });
      } else {
        console.log('🔧 [uploadToS3] Using file buffer');
        fileStream = file.buffer;
      }
      
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: fileStream,
        ContentType: file.mimetype,
        ACL: acl,
        // Optimize for large files (500MB+)
        partSize: 50 * 1024 * 1024, // 50MB parts for faster uploads
        queueSize: 6, // Upload 6 parts concurrently
      };
      
      console.log('🔧 [uploadToS3] Upload params prepared, body type:', file.path ? 'file stream' : 'buffer');
      console.log('🔧 [uploadToS3] Calling s3.upload()...');
      
      const upload = s3.upload(uploadParams);
      
      // Add timeout to the upload (10 minutes for large files)
      const uploadTimeout = setTimeout(() => {
        console.error('🔧 [uploadToS3] Upload timeout after 10 minutes');
        if (fileStream && fileStream.destroy) {
          fileStream.destroy();
        }
        reject(new Error('S3 upload timeout'));
      }, 25 * 60 * 1000); // 25 minutes for large files
      
      upload.on('httpUploadProgress', (progress) => {
        console.log('🔧 [uploadToS3] Upload progress:', Math.round((progress.loaded / progress.total) * 100) + '%');
      });
      
      upload.promise().then((result) => {
        clearTimeout(uploadTimeout);
        console.log('🔧 [uploadToS3] s3.upload() completed successfully');
        if (fileStream && fileStream.destroy) {
          fileStream.destroy();
        }
        resolve(result);
      }).catch((error) => {
        clearTimeout(uploadTimeout);
        console.error('🔧 [uploadToS3] s3.upload() failed:', error.message);
        if (fileStream && fileStream.destroy) {
          fileStream.destroy();
        }
        reject(error);
      });
      
    } catch (error) {
      console.error('🔧 [uploadToS3] Setup error:', error);
      if (fileStream && fileStream.destroy) {
        fileStream.destroy();
      }
      reject(error);
    }
  });
};

const deleteFromS3 = (key) => {
  return s3.deleteObject({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  }).promise();
};

/**
 * Prefixes a key with the S3 root folder
 */
const withRootPrefix = (key) => {
  // Avoid double slashes
  return `${S3_ROOT_PREFIX.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
};

/**
 * Generate organized S3 keys based on file type and context
 */
const generateS3Key = (fileType, fileName, context = {}) => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  let key;
  switch (fileType) {
    case 'profile-pic':
      key = `profile-pics/${timestamp}_${sanitizedFileName}`;
      break;
    case 'thumbnail':
      const courseName = context.courseName ? context.courseName.replace(/[^a-zA-Z0-9.-]/g, '_') : 'unknown';
      key = `thumbnails/${courseName}/${timestamp}_${sanitizedFileName}`;
      break;
    case 'video':
      const videoCourseName = context.courseName ? context.courseName.replace(/[^a-zA-Z0-9.-]/g, '_') : 'unknown';
      key = `videos/${videoCourseName}/${timestamp}_${sanitizedFileName}`;
      break;
    case 'course-material':
      const materialCourseName = context.courseName ? context.courseName.replace(/[^a-zA-Z0-9.-]/g, '_') : 'unknown';
      key = `course-materials/${materialCourseName}/${timestamp}_${sanitizedFileName}`;
      break;
    case 'certificate':
      const certCourseName = context.courseName ? context.courseName.replace(/[^a-zA-Z0-9.-]/g, '_') : 'unknown';
      key = `certificates/${certCourseName}/${timestamp}_${sanitizedFileName}`;
      break;
    default:
      key = `misc/${timestamp}_${sanitizedFileName}`;
  }
  return withRootPrefix(key);
};

/**
 * Upload file with organized folder structure
 */
const uploadFileWithOrganization = async (file, fileType, context = {}) => {
  const s3Key = generateS3Key(fileType, file.originalname, context);
  
  // Determine desired ACL - thumbnails and certificates should be public-read
  const desiredAcl = (fileType === 'thumbnail' || fileType === 'certificate') ? 'public-read' : 'private';

  let usedAcl = desiredAcl;
  try {
    const result = await uploadToS3(file, s3Key, usedAcl);
    return {
      s3Key,
      url: result.Location,
      publicUrl: usedAcl === 'public-read' ? result.Location : null,
    };
  } catch (error) {
    // If bucket has Object Ownership (ACLs disabled) or blocks public ACLs,
    // retry without ACL for thumbnails and certificates.
    const looksLikeAclIssue = /ACL|AccessControlList|InvalidArgument|AccessDenied/i.test(error?.message || '');
    if ((fileType === 'thumbnail' || fileType === 'certificate') && looksLikeAclIssue) {
      try {
        usedAcl = undefined; // omit ACL
        const result = await uploadToS3(file, s3Key, undefined);
        return {
          s3Key,
          url: result.Location,
          publicUrl: null, // object will not be public
        };
      } catch (retryError) {
        throw retryError;
      }
    }
    throw error;
  }
};

/**
 * Delete file from S3
 */
const deleteFileFromS3 = async (s3Key) => {
  return await deleteFromS3(s3Key);
};

/**
 * Get public URL for a file (if it's public)
 */
const getPublicUrl = (s3Key) => {
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
};

module.exports = {
  s3,
  getSignedUrl,
  uploadToS3,
  deleteFromS3,
  generateS3Key,
  uploadFileWithOrganization,
  deleteFileFromS3,
  getPublicUrl,
  withRootPrefix,
}; 