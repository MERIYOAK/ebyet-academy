/**
 * Update Video S3 Keys Script
 * Updates all video S3 keys to point to consolidated location
 * 
 * Usage: node update-video-keys.js [COURSE_ID]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const COURSE_ID = process.argv[2] || '69790910eedf55c69b320094';
const TARGET_FOLDER = `videos/course/${COURSE_ID}/`;

async function updateVideoKeys() {
  try {
    console.log('🚀 Starting video S3 key updates...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    console.log(`   - Target folder: ${TARGET_FOLDER}`);
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Load models
    const Video = require('./server/models/Video');
    const Course = require('./server/models/Course');
    
    // Find all videos for this course
    console.log('🔍 Finding videos to update...');
    const videos = await Video.find({ course: COURSE_ID });
    console.log(`✅ Found ${videos.length} videos for course`);
    
    if (videos.length === 0) {
      console.log('⚠️  No videos found for this course');
      process.exit(0);
    }
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Update each video
    for (const video of videos) {
      try {
        console.log(`\n🎥 Processing: ${video.title?.en || video.title}`);
        console.log(`   Current S3 Key: ${video.s3Key}`);
        
        // Extract filename from current path
        if (!video.s3Key) {
          console.log('⚠️  No S3 key found, skipping...');
          skippedCount++;
          continue;
        }
        
        const filename = video.s3Key.split('/').pop();
        const newS3Key = `${TARGET_FOLDER}${filename}`;
        
        console.log(`   New S3 Key: ${newS3Key}`);
        
        // Skip if already has correct path
        if (video.s3Key.startsWith(TARGET_FOLDER)) {
          console.log('✅ Already has correct S3 key, skipping...');
          skippedCount++;
          continue;
        }
        
        // Update video S3 key
        await Video.findByIdAndUpdate(video._id, { s3Key: newS3Key });
        console.log('✅ S3 key updated successfully');
        updatedCount++;
        
      } catch (videoError) {
        console.error(`❌ Error updating video ${video._id}:`, videoError.message);
      }
    }
    
    // Verify updates
    console.log('\n🔍 Verifying updates...');
    const updatedVideos = await Video.find({ course: COURSE_ID });
    const correctKeys = updatedVideos.filter(v => v.s3Key && v.s3Key.startsWith(TARGET_FOLDER));
    
    console.log(`✅ Videos with correct S3 keys: ${correctKeys.length}/${updatedVideos.length}`);
    
    // Show some examples
    console.log('\n📋 Sample updated video keys:');
    correctKeys.slice(0, 5).forEach((video, index) => {
      console.log(`   ${index + 1}. ${video.title?.en || video.title}`);
      console.log(`      S3 Key: ${video.s3Key}`);
    });
    
    if (correctKeys.length > 5) {
      console.log(`   ... and ${correctKeys.length - 5} more`);
    }
    
    // Summary
    console.log('\n🎉 Database update completed!');
    console.log('============================');
    console.log(`   - Videos updated: ${updatedCount}`);
    console.log(`   - Videos skipped: ${skippedCount}`);
    console.log(`   - Total videos: ${videos.length}`);
    console.log(`   - Target folder: ${TARGET_FOLDER}`);
    
    if (updatedCount > 0) {
      console.log('\n✅ Video S3 keys successfully updated!');
      console.log('🚀 Next steps:');
      console.log('   1. Start your frontend and backend servers');
      console.log('   2. Test video playback in the course');
      console.log('   3. Verify all videos are accessible');
      console.log('   4. Clean up old versioned folders (optional)');
    } else {
      console.log('\n⚠️  No videos were updated');
      console.log('   - Videos may already have correct S3 keys');
      console.log('   - Check if consolidation was needed');
    }
    
  } catch (error) {
    console.error('❌ Database update failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

if (require.main === module) {
  console.log('🚀 Video S3 Keys Update Tool');
  console.log('=============================');
  updateVideoKeys();
}

module.exports = { updateVideoKeys };
