const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

// Use the same S3 client configuration as the rest of the project
const { createS3Client } = require('../utils/s3CourseManager');
const s3Client = createS3Client();

// CORS configuration
const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: ['http://localhost:5173', 'http://localhost:3000', 'https://ebyet-academy.onrender.com', 'https://ibyet.com', 'https://www.ibyet.com'],
      ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
      MaxAgeSeconds: 3600
    }
  ]
};

async function configureBucketCORS() {
  try {
    const command = new PutBucketCorsCommand({
      Bucket: process.env.AWS_S3_BUCKET || 'ibyet-investing',
      CORSConfiguration: corsConfiguration
    });

    const response = await s3Client.send(command);
    console.log('✅ S3 CORS configured successfully:', response);
  } catch (error) {
    console.error('❌ Error configuring S3 CORS:', error);
  }
}

configureBucketCORS();
