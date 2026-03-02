/**
 * S3-Only Video Consolidation Script
 * Consolidates videos from versioned folders without database dependency
 * 
 * Usage: node s3-only-consolidate.js [COURSE_ID] [BUCKET_NAME]
 */

const AWS = require('aws-sdk');
require('dotenv').config();

const COURSE_ID = process.argv[2] || '69790910eedf55c69b320094';
const BUCKET_NAME = process.argv[3] || process.env.AWS_S3_BUCKET;

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

async function consolidateVideos() {
  try {
    console.log('🚀 Starting S3-only video consolidation...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    console.log(`   - Bucket: ${BUCKET_NAME}`);
    console.log(`   - AWS Region: ${process.env.AWS_REGION}`);
    
    // Common versioned folder patterns
    const versionedPatterns = [
      `videos/course-${COURSE_ID}/`,
      `videos/courses/${COURSE_ID}/`,
      `videos/${COURSE_ID}/`,
      `course-${COURSE_ID}/`,
      `courses/${COURSE_ID}/`,
      `course/${COURSE_ID}/`
    ];
    
    // Target folder
    const targetFolder = `videos/course/${COURSE_ID}/`;
    console.log(`📁 Target folder: ${targetFolder}`);
    
    let totalVideosFound = 0;
    let totalVideosMoved = 0;
    let skippedCount = 0;
    
    // Scan each versioned pattern
    for (const pattern of versionedPatterns) {
      console.log(`\n🔍 Scanning pattern: ${pattern}`);
      
      try {
        const listParams = {
          Bucket: BUCKET_NAME,
          Prefix: pattern,
          MaxKeys: 1000
        };
        
        const listedObjects = await s3.listObjectsV2(listParams).promise();
        const videos = listedObjects.Contents || [];
        
        console.log(`   Found ${videos.length} objects in ${pattern}`);
        
        if (videos.length === 0) {
          continue;
        }
        
        // Process each video
        for (const video of videos) {
          totalVideosFound++;
          
          // Skip folders
          if (video.Key.endsWith('/')) {
            continue;
          }
          
          // Extract filename
          const filename = video.Key.split('/').pop();
          const newKey = `${targetFolder}${filename}`;
          
          console.log(`\n🎥 Processing: ${filename}`);
          console.log(`   From: ${video.Key}`);
          console.log(`   To: ${newKey}`);
          
          // Skip if already in target location
          if (video.Key.startsWith(targetFolder)) {
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
          
          try {
            // Copy to new location
            const copyParams = {
              Bucket: BUCKET_NAME,
              CopySource: `${BUCKET_NAME}/${video.Key}`,
              Key: newKey
            };
            
            await s3.copyObject(copyParams).promise();
            console.log('✅ Copied successfully');
            totalVideosMoved++;
            
            // Optional: Delete old version
            // Uncomment to delete old versions after successful copy
            /*
            await s3.deleteObject({ Bucket: BUCKET_NAME, Key: video.Key }).promise();
            console.log('🗑️  Old version deleted');
            */
            
          } catch (copyError) {
            console.error(`❌ Copy failed:`, copyError.message);
          }
        }
        
      } catch (scanError) {
        console.log(`   No objects found in ${pattern}`);
      }
    }
    
    // List final consolidated structure
    console.log('\n📋 Final consolidated structure:');
    try {
      const finalListParams = {
        Bucket: BUCKET_NAME,
        Prefix: targetFolder,
        MaxKeys: 1000
      };
      
      const finalObjects = await s3.listObjectsV2(finalListParams).promise();
      const finalVideos = finalObjects.Contents || [];
      
      console.log(`   - Videos in target folder: ${finalVideos.length}`);
      finalVideos.forEach((video, index) => {
        if (!video.Key.endsWith('/')) {
          console.log(`     ${index + 1}. ${video.Key.split('/').pop()}`);
        }
      });
      
    } catch (listError) {
      console.log('   Could not list final structure');
    }
    
    // Summary
    console.log('\n🎉 Consolidation completed!');
    console.log('===========================');
    console.log(`   - Total videos found: ${totalVideosFound}`);
    console.log(`   - Videos moved: ${totalVideosMoved}`);
    console.log(`   - Videos skipped: ${skippedCount}`);
    console.log(`   - Target folder: ${targetFolder}`);
    
    if (totalVideosMoved > 0) {
      console.log('\n✅ Videos successfully consolidated!');
      console.log('🚀 Next steps:');
      console.log('   1. Update video S3 keys in database');
      console.log('   2. Test video playback');
      console.log('   3. Clean up old versioned folders (optional)');
    } else {
      console.log('\n⚠️  No videos were moved');
      console.log('   - Check if videos are already consolidated');
      console.log('   - Verify bucket and folder structure');
    }
    
  } catch (error) {
    console.error('❌ Consolidation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  console.log('🚀 S3-Only Video Consolidation Tool');
  console.log('===================================');
  consolidateVideos();
}

module.exports = { consolidateVideos };
