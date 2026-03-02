/**
 * S3 Video Consolidation Script
 * Consolidates videos from versioned folders into a single video folder
 * 
 * Usage: node consolidate-s3-videos.js [COURSE_ID]
 */

const AWS = require('aws-sdk');
const mongoose = require('mongoose');
require('dotenv').config();

const COURSE_ID = process.argv[2] || '69790910eedf55c69b320094';

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

async function consolidateVideos() {
  try {
    console.log('🚀 Starting S3 video consolidation...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    console.log(`   - AWS Region: ${process.env.AWS_REGION}`);
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Get course details
    const Course = require('./server/models/Course');
    const Video = require('./server/models/Video');
    
    const course = await Course.findById(COURSE_ID).populate('videos');
    if (!course) {
      throw new Error('Course not found');
    }
    
    console.log(`✅ Found course: ${course.title?.en || course.title}`);
    console.log(`   - Videos: ${course.videos?.length || 0}`);
    
    // Create target folder structure
    const targetFolder = `videos/course/${COURSE_ID}/`;
    console.log(`📁 Target folder: ${targetFolder}`);
    
    // Process each video
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const video of course.videos || []) {
      try {
        console.log(`\n🎥 Processing video: ${video.title?.en || video.title}`);
        console.log(`   Current S3 Key: ${video.s3Key}`);
        
        if (!video.s3Key) {
          console.log('⚠️  No S3 key found, skipping...');
          skippedCount++;
          continue;
        }
        
        // Extract filename from current path
        const currentKey = video.s3Key;
        const filename = currentKey.split('/').pop();
        const newKey = `${targetFolder}${filename}`;
        
        console.log(`   New S3 Key: ${newKey}`);
        
        // Check if video is already in target location
        if (currentKey.startsWith(targetFolder)) {
          console.log('✅ Video already in target location, skipping...');
          skippedCount++;
          continue;
        }
        
        // Check if target file already exists
        try {
          await s3.headObject({ Bucket: process.env.AWS_S3_BUCKET, Key: newKey }).promise();
          console.log('⚠️  Target file already exists, skipping...');
          skippedCount++;
          continue;
        } catch (headError) {
          // File doesn't exist, proceed with copy
        }
        
        // Copy video to new location
        console.log('📋 Copying video to new location...');
        const copyParams = {
          Bucket: process.env.AWS_S3_BUCKET,
          CopySource: `${process.env.AWS_S3_BUCKET}/${currentKey}`,
          Key: newKey
        };
        
        await s3.copyObject(copyParams).promise();
        console.log('✅ Video copied successfully');
        
        // Update video S3 key in database
        await Video.findByIdAndUpdate(video._id, { s3Key: newKey });
        console.log('✅ Video database updated');
        
        processedCount++;
        
        // Optional: Delete old version after successful copy
        // Uncomment the following lines if you want to delete old versions
        /*
        try {
          await s3.deleteObject({ Bucket: process.env.AWS_S3_BUCKET, Key: currentKey }).promise();
          console.log('🗑️  Old version deleted');
        } catch (deleteError) {
          console.log('⚠️  Could not delete old version:', deleteError.message);
        }
        */
        
      } catch (videoError) {
        console.error(`❌ Error processing video ${video._id}:`, videoError.message);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n🎉 Consolidation completed!');
    console.log('===========================');
    console.log(`   - Processed: ${processedCount} videos`);
    console.log(`   - Skipped: ${skippedCount} videos`);
    console.log(`   - Errors: ${errorCount} videos`);
    console.log(`   - Target folder: ${targetFolder}`);
    
    // List final structure
    console.log('\n📋 Final video structure:');
    const listParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: targetFolder,
      MaxKeys: 100
    };
    
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    console.log(`   - Videos in target folder: ${listedObjects.Contents?.length || 0}`);
    
    listedObjects.Contents?.forEach((obj, index) => {
      console.log(`     ${index + 1}. ${obj.Key}`);
    });
    
    console.log('\n✅ All videos are now consolidated in a single folder!');
    console.log('🚀 Your course is ready for the new system!');
    
  } catch (error) {
    console.error('❌ Consolidation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

if (require.main === module) {
  console.log('🚀 S3 Video Consolidation Tool');
  console.log('===============================');
  consolidateVideos();
}

module.exports = { consolidateVideos };
