/**
 * Comprehensive S3 Scanner
 * Scans entire bucket to find all video files related to the course
 * 
 * Usage: node scan-all-s3.js [COURSE_ID] [BUCKET_NAME]
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

async function scanAndConsolidate() {
  try {
    console.log('🚀 Starting comprehensive S3 scan...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    console.log(`   - Bucket: ${BUCKET_NAME}`);
    console.log(`   - AWS Region: ${process.env.AWS_REGION}`);
    
    // Scan entire bucket for video files
    console.log('\n🔍 Scanning entire bucket for video files...');
    const allObjects = [];
    let continuationToken = null;
    
    do {
      const listParams = {
        Bucket: BUCKET_NAME,
        MaxKeys: 1000
      };
      
      if (continuationToken) {
        listParams.ContinuationToken = continuationToken;
      }
      
      const response = await s3.listObjectsV2(listParams).promise();
      allObjects.push(...(response.Contents || []));
      continuationToken = response.NextContinuationToken;
      
      console.log(`   Scanned ${allObjects.length} objects...`);
      
    } while (continuationToken);
    
    console.log(`✅ Total objects in bucket: ${allObjects.length}`);
    
    // Filter for video files and course-related files
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
    const courseRelatedObjects = allObjects.filter(obj => {
      const key = obj.Key.toLowerCase();
      
      // Check if it's a video file
      const isVideo = videoExtensions.some(ext => key.endsWith(ext));
      
      // Check if it's related to the course (by ID or common patterns)
      const isCourseRelated = key.includes(COURSE_ID.toLowerCase()) || 
                             key.includes('course') || 
                             key.includes('video') ||
                             key.includes('lesson') ||
                             key.includes('lecture');
      
      return isVideo && isCourseRelated;
    });
    
    console.log(`\n📋 Found ${courseRelatedObjects.length} course-related video files:`);
    
    if (courseRelatedObjects.length === 0) {
      console.log('   No course-related videos found. Showing all video files in bucket:');
      
      const allVideos = allObjects.filter(obj => {
        const key = obj.Key.toLowerCase();
        return videoExtensions.some(ext => key.endsWith(ext));
      });
      
      console.log(`   Found ${allVideos.length} total video files:`);
      allVideos.slice(0, 20).forEach((obj, index) => {
        console.log(`     ${index + 1}. ${obj.Key} (${(obj.Size / 1024 / 1024).toFixed(2)} MB)`);
      });
      
      if (allVideos.length > 20) {
        console.log(`     ... and ${allVideos.length - 20} more`);
      }
      
      return;
    }
    
    // Group by folder structure
    const folderGroups = {};
    courseRelatedObjects.forEach(obj => {
      const folder = obj.Key.substring(0, obj.Key.lastIndexOf('/'));
      folderGroups[folder] = (folderGroups[folder] || 0) + 1;
    });
    
    console.log('\n📁 Folder structure:');
    Object.entries(folderGroups).forEach(([folder, count]) => {
      console.log(`   ${folder}: ${count} videos`);
    });
    
    // Show individual files
    console.log('\n🎥 Individual video files:');
    courseRelatedObjects.forEach((obj, index) => {
      console.log(`   ${index + 1}. ${obj.Key} (${(obj.Size / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Ask if user wants to consolidate
    console.log('\n🤔 Would you like to consolidate these videos?');
    console.log('   Target folder: videos/course/' + COURSE_ID + '/');
    console.log('   Run: node consolidate-found-videos.js to proceed');
    
    // Save found videos to a file for consolidation
    const fs = require('fs');
    const videoList = courseRelatedObjects.map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified
    }));
    
    fs.writeFileSync(
      `found-videos-${COURSE_ID}.json`, 
      JSON.stringify(videoList, null, 2)
    );
    
    console.log(`\n💾 Saved video list to: found-videos-${COURSE_ID}.json`);
    
  } catch (error) {
    console.error('❌ Scan failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  console.log('🚀 Comprehensive S3 Scanner');
  console.log('============================');
  scanAndConsolidate();
}

module.exports = { scanAndConsolidate };
