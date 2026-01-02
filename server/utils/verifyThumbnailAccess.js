/**
 * Verify thumbnail is accessible via public URL
 * This helps debug bucket policy issues
 */
const { S3Client, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  ? new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

/**
 * Check if thumbnail is publicly accessible
 */
const verifyThumbnailAccess = async (s3Key) => {
  if (!s3Client || !s3Key) {
    console.log('⚠️  Cannot verify thumbnail access - S3 client or key missing');
    return { accessible: false, reason: 'S3 client or key missing' };
  }

  try {
    // Try to head the object (this checks if it exists and is accessible)
    const headCommand = new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
    });

    await s3Client.send(headCommand);
    
    // If we can head it, check if it matches the public path pattern
    const publicPathPattern = /^ibyet-investing-folder\/courses\/.+\/v\d+\/thumbnails\/.+$/;
    const matchesPattern = publicPathPattern.test(s3Key);
    
    const publicUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    
    console.log('🔍 Thumbnail Access Check:');
    console.log(`   - S3 Key: ${s3Key}`);
    console.log(`   - Matches public path pattern: ${matchesPattern}`);
    console.log(`   - Public URL: ${publicUrl}`);
    
    return {
      accessible: true,
      matchesPattern,
      publicUrl,
      s3Key
    };
  } catch (error) {
    console.error('❌ Thumbnail access check failed:', error.message);
    return {
      accessible: false,
      reason: error.message,
      s3Key
    };
  }
};

module.exports = {
  verifyThumbnailAccess
};









