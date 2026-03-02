/**
 * Consolidate Found Videos Script
 * Consolidates all found videos from versioned folders to a single folder
 * 
 * Usage: node consolidate-found-videos.js [COURSE_ID]
 */

const AWS = require('aws-sdk');
const fs = require('fs');
require('dotenv').config();

const COURSE_ID = process.argv[2] || '69790910eedf55c69b320094';
const BUCKET_NAME = process.env.AWS_S3_BUCKET;

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

async function consolidateFoundVideos() {
  try {
    console.log('🚀 Starting video consolidation...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    console.log(`   - Bucket: ${BUCKET_NAME}`);
    
    // Load found videos from the scan
    const videoListFile = `found-videos-${COURSE_ID}.json`;
    
    if (!fs.existsSync(videoListFile)) {
      console.log('❌ Video list file not found. Run scan-all-s3.js first.');
      process.exit(1);
    }
    
    const videoList = JSON.parse(fs.readFileSync(videoListFile, 'utf8'));
    console.log(`✅ Loaded ${videoList.length} videos from scan results`);
    
    // Target folder
    const targetFolder = `videos/course/${COURSE_ID}/`;
    console.log(`📁 Target folder: ${targetFolder}`);
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let totalSize = 0;
    
    // Process each video
    for (const video of videoList) {
      try {
        const currentKey = video.key;
        const filename = currentKey.split('/').pop();
        const newKey = `${targetFolder}${filename}`;
        
        console.log(`\n🎥 Processing: ${filename}`);
        console.log(`   From: ${currentKey}`);
        console.log(`   Size: ${(video.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Skip if already in target location
        if (currentKey.startsWith(targetFolder)) {
          console.log('✅ Already in target location, skipping...');
          skippedCount++;
          continue;
        }
        
        // Check if target exists
        try {
          await s3.headObject({ Bucket: BUCKET_NAME, Key: newKey }).promise();
          console.log('⚠️  Target already exists, skipping...');
          skippedCount++;
          continue;
        } catch (headError) {
          // Target doesn't exist, proceed
        }
        
        // Copy to new location
        console.log('📋 Copying to new location...');
        const copyParams = {
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${currentKey}`,
          Key: newKey
        };
        
        await s3.copyObject(copyParams).promise();
        console.log('✅ Copied successfully');
        
        processedCount++;
        totalSize += video.size;
        
        // Optional: Delete old version after successful copy
        // Uncomment the following lines to delete old versions
        /*
        try {
          await s3.deleteObject({ Bucket: BUCKET_NAME, Key: currentKey }).promise();
          console.log('🗑️  Old version deleted');
        } catch (deleteError) {
          console.log('⚠️  Could not delete old version:', deleteError.message);
        }
        */
        
      } catch (videoError) {
        console.error(`❌ Error processing video:`, videoError.message);
        errorCount++;
      }
    }
    
    // Verify final structure
    console.log('\n🔍 Verifying final structure...');
    try {
      const finalListParams = {
        Bucket: BUCKET_NAME,
        Prefix: targetFolder,
        MaxKeys: 1000
      };
      
      const finalObjects = await s3.listObjectsV2(finalListParams).promise();
      const finalVideos = finalObjects.Contents || [];
      
      console.log(`✅ Final structure verified: ${finalVideos.length} videos in target folder`);
      
      // Show some examples
      finalVideos.slice(0, 10).forEach((video, index) => {
        if (!video.Key.endsWith('/')) {
          console.log(`   ${index + 1}. ${video.Key.split('/').pop()}`);
        }
      });
      
      if (finalVideos.length > 10) {
        console.log(`   ... and ${finalVideos.length - 10} more`);
      }
      
    } catch (verifyError) {
      console.log('⚠️  Could not verify final structure:', verifyError.message);
    }
    
    // Summary
    console.log('\n🎉 Consolidation completed!');
    console.log('===========================');
    console.log(`   - Videos processed: ${processedCount}`);
    console.log(`   - Videos skipped: ${skippedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Total size moved: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   - Target folder: ${targetFolder}`);
    
    if (processedCount > 0) {
      console.log('\n✅ Videos successfully consolidated!');
      console.log('🚀 Next steps:');
      console.log('   1. Update video S3 keys in database');
      console.log('   2. Test video playback');
      console.log('   3. Clean up old versioned folders (optional)');
      
      // Create database update script
      console.log('\n📝 Creating database update script...');
      const updateScript = `
// Database update script for ${COURSE_ID}
// Run this to update video S3 keys in your database

const mongoose = require('mongoose');
require('dotenv').config();

async function updateVideoKeys() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Video = require('./server/models/Video');
  
  const courseId = '${COURSE_ID}';
  const targetFolder = '${targetFolder}';
  
  // Update all videos for this course
  const result = await Video.updateMany(
    { course: courseId },
    { 
      \$set: { 
        s3Key: { \$concat: [targetFolder, { \$substr: ['\$s3Key', { \$strLenCP: { \$subtract: [{ \$strLenCP: '\$s3Key' }, { \$indexOfCP: ['\$s3Key', '/'] }] }, { \$indexOfCP: ['\$s3Key', '/'] }] }] }
      }
    }
  );
  
  console.log('Updated', result.modifiedCount, 'video keys');
  await mongoose.connection.close();
}

updateVideoKeys();
`;
      
      fs.writeFileSync(`update-video-keys-${COURSE_ID}.js`, updateScript);
      console.log(`💾 Created update script: update-video-keys-${COURSE_ID}.js`);
      
    } else {
      console.log('\n⚠️  No videos were processed');
      console.log('   - Check if videos are already consolidated');
      console.log('   - Verify S3 permissions');
    }
    
  } catch (error) {
    console.error('❌ Consolidation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  console.log('🚀 Found Videos Consolidation Tool');
  console.log('==================================');
  consolidateFoundVideos();
}

module.exports = { consolidateFoundVideos };
