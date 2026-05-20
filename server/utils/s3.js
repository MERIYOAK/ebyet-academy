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

const uploadToS3 = (file, key) => {
  const fs = require('fs');
  
  
  return new Promise((resolve, reject) => {
    let fileStream;
    
    try {
      // Create file stream with error handling
      if (file.path) {
        fileStream = fs.createReadStream(file.path);
        
        fileStream.on('error', (error) => {
          console.error('ðŸ”§ [uploadToS3] File stream error:', error);
          reject(error);
        });
        
        fileStream.on('open', () => {
        });
      } else {
        fileStream = file.buffer;
      }
      
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: fileStream,
        ContentType: file.mimetype,
        // Optimize for large files (500MB+)
        partSize: 50 * 1024 * 1024, // 50MB parts for faster uploads
        queueSize: 6, // Upload 6 parts concurrently
      };
      
      
      const upload = s3.upload(uploadParams);
      
      // Add timeout to the upload (10 minutes for large files)
      const uploadTimeout = setTimeout(() => {
        console.error('ðŸ”§ [uploadToS3] Upload timeout after 10 minutes');
        if (fileStream && fileStream.destroy) {
          fileStream.destroy();
        }
        reject(new Error('S3 upload timeout'));
      }, 25 * 60 * 1000); // 25 minutes for large files
      
      upload.on('httpUploadProgress', (progress) => {
      });
      
      upload.promise().then((result) => {
        clearTimeout(uploadTimeout);
        if (fileStream && fileStream.destroy) {
          fileStream.destroy();
        }
        resolve(result);
      }).catch((error) => {
        clearTimeout(uploadTimeout);
        console.error('ðŸ”§ [uploadToS3] s3.upload() failed:', error.message);
        if (fileStream && fileStream.destroy) {
          fileStream.destroy();
        }
        reject(error);
      });
      
    } catch (error) {
      console.error('ðŸ”§ [uploadToS3] Setup error:', error);
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
      let courseName = 'unknown';
      if (context.courseName) {
        if (typeof context.courseName === 'object' && context.courseName !== null) {
          courseName = context.courseName.en || context.courseName.tg || 'course';
        } else {
          courseName = context.courseName;
        }
        courseName = String(courseName).replace(/[^a-zA-Z0-9.-]/g, '_');
      }
      key = `thumbnails/${courseName}/${timestamp}_${sanitizedFileName}`;
      break;
    case 'video':
      let videoCourseName = 'unknown';
      if (context.courseName) {
        if (typeof context.courseName === 'object' && context.courseName !== null) {
          videoCourseName = context.courseName.en || context.courseName.tg || 'course';
        } else {
          videoCourseName = context.courseName;
        }
        videoCourseName = String(videoCourseName).replace(/[^a-zA-Z0-9.-]/g, '_');
      }
      key = `videos/${videoCourseName}/${timestamp}_${sanitizedFileName}`;
      break;
    case 'course-material':
      let materialCourseName = 'unknown';
      if (context.courseName) {
        if (typeof context.courseName === 'object' && context.courseName !== null) {
          materialCourseName = context.courseName.en || context.courseName.tg || 'course';
        } else {
          materialCourseName = context.courseName;
        }
        materialCourseName = String(materialCourseName).replace(/[^a-zA-Z0-9.-]/g, '_');
      }
      key = `course-materials/${materialCourseName}/${timestamp}_${sanitizedFileName}`;
      break;
    case 'certificate':
      let certCourseName = 'unknown';
      if (context.courseName) {
        if (typeof context.courseName === 'object' && context.courseName !== null) {
          certCourseName = context.courseName.en || context.courseName.tg || 'course';
        } else {
          certCourseName = context.courseName;
        }
        certCourseName = String(certCourseName).replace(/[^a-zA-Z0-9.-]/g, '_');
      }
      key = `certificates/${certCourseName}/${timestamp}_${sanitizedFileName}`;
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
      key = `bundles/thumbnails/${timestamp}_${bundleIdentifier}`;
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
  // Handle case where context is passed as a string (for bundle-thumbnails)
  const contextObj = typeof context === 'string' ? { bundleIdentifier: context } : context;
  const s3Key = generateS3Key(fileType, file.originalname, contextObj);
  
  try {
    const result = await uploadToS3(file, s3Key);
    return {
      s3Key,
      url: result.Location,
      publicUrl: (fileType === 'thumbnail' || fileType === 'bundle-thumbnails' || fileType === 'certificate') ? getPublicUrl(s3Key) : null,
    };
  } catch (error) {
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