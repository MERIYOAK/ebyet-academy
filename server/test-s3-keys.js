const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy');

// Import models
const Video = require('./server/models/Video');

async function testS3Keys() {
  try {
    console.log('🔧 Testing S3 keys for course videos...');
    
    const courseId = '68a616a61e7edf6233cc14e7';
    
    // Get all videos for the course
    const videos = await Video.getByCourseVersion(courseId, 1);
    console.log(`\n📹 Found ${videos.length} videos for course`);
    
    videos.forEach((video, index) => {
      console.log(`\n${index + 1}. "${video.title}"`);
      console.log(`   - Video ID: ${video._id}`);
      console.log(`   - S3 Key: ${video.s3Key}`);
      console.log(`   - Is Free Preview: ${video.isFreePreview}`);
      console.log(`   - Duration: ${video.duration} seconds`);
      console.log(`   - File Size: ${video.fileSize ? (video.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown'}`);
      console.log(`   - Status: ${video.status}`);
    });
    
    // Check if any videos are missing S3 keys
    const videosWithoutS3Key = videos.filter(v => !v.s3Key);
    if (videosWithoutS3Key.length > 0) {
      console.log(`\n❌ Found ${videosWithoutS3Key.length} videos without S3 keys:`);
      videosWithoutS3Key.forEach(video => {
        console.log(`   - "${video.title}" (${video._id})`);
      });
    } else {
      console.log(`\n✅ All videos have S3 keys`);
    }
    
    // Check if any videos have the same S3 key (which would cause conflicts)
    const s3Keys = videos.map(v => v.s3Key).filter(Boolean);
    const uniqueS3Keys = [...new Set(s3Keys)];
    if (s3Keys.length !== uniqueS3Keys.length) {
      console.log(`\n⚠️ Found duplicate S3 keys!`);
      console.log(`   Total S3 keys: ${s3Keys.length}`);
      console.log(`   Unique S3 keys: ${uniqueS3Keys.length}`);
    } else {
      console.log(`\n✅ All S3 keys are unique`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testS3Keys();
