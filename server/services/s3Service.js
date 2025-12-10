const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

class S3Service {
  constructor() {
    this.s3Client = null;
    this.bucketRegion = null;
    this.bucketName = null;
    this.isInitialized = false;
    this.initializeS3();
  }

  /**
   * Initialize S3 client with environment variables
   */
  initializeS3() {
    // Check if AWS credentials are available
    const hasAwsCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    
    if (!hasAwsCredentials) {
      console.log('⚠️  S3 client not initialized - missing AWS credentials');
      console.log('💡 Profile photo uploads will be disabled');
      return;
    }

    // Get bucket configuration from environment variables (prioritize legacy AWS keys)
    this.bucketName = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;
    const defaultRegion = process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1';

    if (!this.bucketName) {
      console.log('⚠️  S3 bucket name not configured - profile photo uploads will be disabled');
      console.log('💡 Set AWS_S3_BUCKET or S3_BUCKET environment variable');
      return;
    }

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: defaultRegion,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log(`✅ S3 client initialized with bucket: ${this.bucketName}, region: ${defaultRegion}`);
    this.isInitialized = true;
  }

  /**
   * Check if S3 is configured and ready
   */
  isConfigured() {
    return this.isInitialized && this.s3Client && this.bucketName;
  }

  /**
   * Get the current bucket name
   */
  getBucketName() {
    return this.bucketName;
  }

  /**
   * Get the current bucket region
   */
  getBucketRegion() {
    return this.bucketRegion;
  }

  /**
   * Detect bucket region by attempting to access it
   */
  async detectBucketRegion() {
    if (!this.isConfigured()) {
      throw new Error('S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables to enable profile photo uploads.');
    }

    try {
      const command = new HeadBucketCommand({ Bucket: this.bucketName });
      await this.s3Client.send(command);
      // If successful, bucket is in the current region
      this.bucketRegion = this.s3Client.config.region();
      console.log(`✅ Bucket region confirmed: ${this.bucketRegion}`);
      return this.bucketRegion;
    } catch (error) {
      if (error.name === 'PermanentRedirect' || error.$metadata?.httpStatusCode === 301) {
        // Extract region from the error response
        const region = error.$metadata?.extendedRequestId?.split('/')[1] || 
                      error.$metadata?.cfId || 
                      'us-east-1';
        
        console.log(`🔄 Detected bucket region: ${region}`);
        
        // Reinitialize S3 client with correct region
        this.s3Client = new S3Client({
          region: region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });
        
        this.bucketRegion = region;
        return region;
      }
      throw error;
    }
  }

  /**
   * Ensure S3 is properly configured and region is detected
   */
  async ensureS3Ready() {
    if (!this.isConfigured()) {
      throw new Error('S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables.');
    }

    if (!this.bucketRegion) {
      await this.detectBucketRegion();
    }
  }

  /**
   * Upload profile photo to S3
   * @param {Buffer} fileBuffer - The file buffer
   * @param {string} originalName - Original filename
   * @param {string} userId - User ID for unique naming
   * @returns {Promise<string>} - S3 object key
   */
  async uploadProfilePhoto(fileBuffer, originalName, userId) {
    try {
      await this.ensureS3Ready();

      // Generate unique filename
      const fileExtension = originalName.split('.').pop();
      const uniqueFileName = `${userId}-${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
      const key = `persi-academy/profile-pictures/${uniqueFileName}`;

      // Upload to S3
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: this.getContentType(fileExtension),
        ACL: 'private',
        Metadata: {
          'user-id': userId,
          'upload-date': new Date().toISOString(),
          'source': 'manual-upload'
        },
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));
      console.log(`✅ Profile photo uploaded successfully: ${key}`);
      
      return key;
    } catch (error) {
      console.error('❌ Error uploading profile photo to S3:', error);
      
      // Handle region-specific errors
      if (error.name === 'PermanentRedirect' || error.$metadata?.httpStatusCode === 301) {
        console.log('🔄 Retrying with correct region...');
        try {
          // Reset bucket region and retry
          this.bucketRegion = null;
          await this.detectBucketRegion();
          
          // Retry the upload
          const fileExtension = originalName.split('.').pop();
          const uniqueFileName = `${userId}-${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
          const key = `profile-pictures/${uniqueFileName}`;

          const uploadParams = {
            Bucket: this.bucketName,
            Key: key,
            Body: fileBuffer,
            ContentType: this.getContentType(fileExtension),
            ACL: 'private',
            Metadata: {
              'user-id': userId,
              'upload-date': new Date().toISOString(),
              'source': 'manual-upload'
            },
          };

          await this.s3Client.send(new PutObjectCommand(uploadParams));
          console.log(`✅ Profile photo uploaded successfully after region fix: ${key}`);
          return key;
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError);
          throw new Error('Failed to upload profile photo after region detection');
        }
      }
      
      throw new Error('Failed to upload profile photo');
    }
  }

  /**
   * Download Google profile photo and upload to S3
   * @param {string} googlePhotoUrl - Google profile photo URL
   * @param {string} userId - User ID
   * @returns {Promise<string>} - S3 object key
   */
  async uploadGoogleProfilePhoto(googlePhotoUrl, userId) {
    try {
      await this.ensureS3Ready();

      console.log(`📥 Downloading Google profile photo for user: ${userId}`);

      // Download the image from Google
      const response = await fetch(googlePhotoUrl);
      if (!response.ok) {
        throw new Error('Failed to download Google profile photo');
      }

      const imageBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(imageBuffer);

      // Determine file extension from content type
      const contentType = response.headers.get('content-type');
      const extension = this.getExtensionFromContentType(contentType);

      // Generate unique filename
      const uniqueFileName = `${userId}-google-${crypto.randomBytes(16).toString('hex')}.${extension}`;
      const key = `profile-pictures/${uniqueFileName}`;

      // Upload to S3
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'private',
        Metadata: {
          'user-id': userId,
          'source': 'google',
          'upload-date': new Date().toISOString(),
        },
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));
      console.log(`✅ Google profile photo uploaded successfully: ${key}`);
      
      return key;
    } catch (error) {
      console.error('❌ Error uploading Google profile photo to S3:', error);
      
      // Handle region-specific errors
      if (error.name === 'PermanentRedirect' || error.$metadata?.httpStatusCode === 301) {
        console.log('🔄 Retrying Google profile photo upload with correct region...');
        try {
          // Reset bucket region and retry
          this.bucketRegion = null;
          await this.detectBucketRegion();
          
          // Download the image from Google again
          const response = await fetch(googlePhotoUrl);
          if (!response.ok) {
            throw new Error('Failed to download Google profile photo');
          }

          const imageBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(imageBuffer);

          const contentType = response.headers.get('content-type');
          const extension = this.getExtensionFromContentType(contentType);

          const uniqueFileName = `${userId}-google-${crypto.randomBytes(16).toString('hex')}.${extension}`;
          const key = `profile-pictures/${uniqueFileName}`;

          const uploadParams = {
            Bucket: this.bucketName,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ACL: 'private',
            Metadata: {
              'user-id': userId,
              'source': 'google',
              'upload-date': new Date().toISOString(),
            },
          };

          await this.s3Client.send(new PutObjectCommand(uploadParams));
          console.log(`✅ Google profile photo uploaded successfully after region fix: ${key}`);
          return key;
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError);
          console.log('⚠️  Continuing without Google profile photo');
          return null;
        }
      }
      
      console.log('⚠️  Continuing without Google profile photo');
      return null;
    }
  }

  /**
   * Generate signed URL for profile photo
   * @param {string} profilePhotoKey - S3 object key
   * @param {number} expiresIn - Expiration time in seconds (default: 60)
   * @returns {Promise<string>} - Signed URL
   */
  async getProfilePhotoSignedUrl(profilePhotoKey, expiresIn = 60) {
    try {
      await this.ensureS3Ready();

      if (!profilePhotoKey) {
        throw new Error('Profile photo key is required');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: profilePhotoKey,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      console.log(`✅ Generated signed URL for profile photo: ${profilePhotoKey}`);
      
      return signedUrl;
    } catch (error) {
      console.error('❌ Error generating signed URL:', error);
      
      // Handle region-specific errors
      if (error.name === 'PermanentRedirect' || error.$metadata?.httpStatusCode === 301) {
        console.log('🔄 Retrying signed URL generation with correct region...');
        try {
          // Reset bucket region and retry
          this.bucketRegion = null;
          await this.detectBucketRegion();
          
          const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: profilePhotoKey,
          });

          const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
          console.log(`✅ Generated signed URL after region fix: ${profilePhotoKey}`);
          return signedUrl;
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError);
          throw new Error('Failed to generate profile photo URL after region detection');
        }
      }
      
      throw new Error('Failed to generate profile photo URL');
    }
  }

  /**
   * Delete profile photo from S3
   * @param {string} profilePhotoKey - S3 object key
   * @returns {Promise<void>}
   */
  async deleteProfilePhoto(profilePhotoKey) {
    try {
      await this.ensureS3Ready();

      if (!profilePhotoKey) {
        console.log('No profile photo key provided for deletion');
        return;
      }

      const deleteParams = {
        Bucket: this.bucketName,
        Key: profilePhotoKey,
      };

      await this.s3Client.send(new DeleteObjectCommand(deleteParams));
      console.log(`✅ Profile photo deleted successfully: ${profilePhotoKey}`);
    } catch (error) {
      console.error('❌ Error deleting profile photo from S3:', error);
      
      // Handle region-specific errors
      if (error.name === 'PermanentRedirect' || error.$metadata?.httpStatusCode === 301) {
        console.log('🔄 Retrying deletion with correct region...');
        try {
          // Reset bucket region and retry
          this.bucketRegion = null;
          await this.detectBucketRegion();
          
          const deleteParams = {
            Bucket: this.bucketName,
            Key: profilePhotoKey,
          };

          await this.s3Client.send(new DeleteObjectCommand(deleteParams));
          console.log(`✅ Profile photo deleted successfully after region fix: ${profilePhotoKey}`);
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError);
          throw new Error('Failed to delete profile photo after region detection');
        }
      } else {
        throw new Error('Failed to delete profile photo');
      }
    }
  }

  /**
   * Validate file type and size
   * @param {Object} file - Multer file object
   * @param {number} maxSize - Maximum file size in bytes
   * @returns {boolean} - Whether file is valid
   */
  validateProfilePhoto(file, maxSize = 5 * 1024 * 1024) { // 5MB default
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`);
    }

    return true;
  }

  /**
   * Get content type based on file extension
   * @param {string} extension - File extension
   * @returns {string} - Content type
   */
  getContentType(extension) {
    const contentTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Get file extension from content type
   * @param {string} contentType - Content type
   * @returns {string} - File extension
   */
  getExtensionFromContentType(contentType) {
    const contentTypes = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return contentTypes[contentType] || 'jpg';
  }

  /**
   * Get S3 configuration status
   * @returns {Object} - Configuration status
   */
  getConfigurationStatus() {
    return {
      isConfigured: this.isConfigured(),
      bucketName: this.bucketName,
      bucketRegion: this.bucketRegion,
      hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      hasBucket: !!process.env.AWS_S3_BUCKET,
      hasRegion: !!process.env.AWS_REGION,
      environment: process.env.NODE_ENV || 'development',
      // Show which variables are set
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set',
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set',
      awsRegion: process.env.AWS_REGION || 'Not set',
      awsS3Bucket: process.env.AWS_S3_BUCKET || 'Not set'
    };
  }
}

// Export a singleton instance
module.exports = new S3Service(); 