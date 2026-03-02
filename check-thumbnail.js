/**
 * Check Course Thumbnail
 * Verifies course thumbnail data and S3 key
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const COURSE_ID = '69790910eedf55c69b320094';

async function checkThumbnail() {
  let client;
  
  try {
    console.log('🔍 Checking course thumbnail...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    
    // Connect to database
    const uri = process.env.MONGODB_URI;
    client = new MongoClient(uri);
    await client.connect();
    
    const dbName = uri.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    // Get course details
    console.log('\n🔍 Finding course...');
    const course = await db.collection('courses').findOne({ 
      _id: new ObjectId(COURSE_ID) 
    });
    
    if (!course) {
      console.log('❌ Course not found');
      process.exit(1);
    }
    
    console.log('✅ Course found!');
    console.log('\n📋 Course Details:');
    console.log(`   - Title: ${course.title?.en || course.title}`);
    console.log(`   - Status: ${course.status}`);
    console.log(`   - Is Public: ${course.isPublic}`);
    
    console.log('\n🖼️  Thumbnail Information:');
    console.log(`   - thumbnailURL: ${course.thumbnailURL || 'NOT SET'}`);
    console.log(`   - thumbnailS3Key: ${course.thumbnailS3Key || 'NOT SET'}`);
    console.log(`   - thumbnail: ${course.thumbnail || 'NOT SET'}`);
    
    // Check if thumbnail exists in S3
    if (course.thumbnailS3Key) {
      console.log('\n🔍 Checking S3 for thumbnail...');
      
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      
      try {
        const headParams = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: course.thumbnailS3Key
        };
        
        const headResult = await s3.headObject(headParams).promise();
        console.log('✅ Thumbnail exists in S3');
        console.log(`   - Size: ${(headResult.ContentLength / 1024).toFixed(2)} KB`);
        console.log(`   - Last Modified: ${headResult.LastModified}`);
        console.log(`   - Content Type: ${headResult.ContentType}`);
        
        // Generate public URL
        const publicUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${course.thumbnailS3Key}`;
        console.log(`   - Public URL: ${publicUrl}`);
        
      } catch (s3Error) {
        console.log('❌ Thumbnail NOT found in S3');
        console.log(`   - Error: ${s3Error.message}`);
      }
    }
    
    // Look for potential thumbnail files in S3
    console.log('\n🔍 Searching for thumbnail files in S3...');
    
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    // Common thumbnail patterns
    const patterns = [
      `thumbnails/course-${COURSE_ID}`,
      `thumbnails/courses/${COURSE_ID}`,
      `thumbnails/${COURSE_ID}`,
      `course-${COURSE_ID}`,
      `courses/${COURSE_ID}`,
      `${COURSE_ID}`
    ];
    
    for (const pattern of patterns) {
      try {
        const listParams = {
          Bucket: process.env.AWS_S3_BUCKET,
          Prefix: pattern,
          MaxKeys: 10
        };
        
        const objects = await s3.listObjectsV2(listParams).promise();
        const files = objects.Contents?.filter(obj => !obj.Key.endsWith('/')) || [];
        
        if (files.length > 0) {
          console.log(`\n📁 Found ${files.length} files in: ${pattern}`);
          files.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.Key}`);
            console.log(`      Size: ${(file.Size / 1024).toFixed(2)} KB`);
          });
        }
      } catch (listError) {
        // Skip if pattern doesn't exist
      }
    }
    
    console.log('\n💡 Recommendations:');
    if (!course.thumbnailS3Key) {
      console.log('   - thumbnailS3Key is not set in database');
      console.log('   - Upload thumbnail and set thumbnailS3Key');
    }
    
    if (!course.thumbnailURL) {
      console.log('   - thumbnailURL is not set in database');
      console.log('   - Set thumbnailURL to S3 public URL');
    }
    
    console.log('\n🔧 Fix Options:');
    console.log('   1. Upload thumbnail to S3');
    console.log('   2. Update course thumbnailS3Key in database');
    console.log('   3. Update course thumbnailURL in database');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  console.log('🔍 Course Thumbnail Check Tool');
  console.log('==============================');
  checkThumbnail();
}

module.exports = { checkThumbnail };
