const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy');

// Import models and utilities
const User = require('./models/User');
const Video = require('./models/Video');
const { userHasPurchased, filterVideosByAccess } = require('./utils/purchaseUtils');

async function testVideoAccess() {
  try {
    console.log('🔧 Testing video access control...');
    
    const userId = '68a66a72abb59c388de0a9cf'; // The user who purchased the course
    const courseId = '68a616a61e7edf6233cc14e7'; // The course ID
    
    console.log(`Testing user: ${userId}`);
    console.log(`Testing course: ${courseId}`);
    
    // Test purchase verification
    const hasPurchased = await userHasPurchased(userId, courseId);
    console.log(`\n🔍 Purchase verification result: ${hasPurchased}`);
    
    // Get videos for the course
    const videos = await Video.getByCourseVersion(courseId, 1);
    console.log(`\n📹 Found ${videos.length} videos for course`);
    
    // Test video access filtering
    const videosWithAccess = await filterVideosByAccess(videos, userId, courseId, false);
    console.log(`\n🔐 Videos with access control applied:`);
    
    videosWithAccess.forEach((video, index) => {
      console.log(`   ${index + 1}. "${video.title}"`);
      console.log(`      - hasAccess: ${video.hasAccess}`);
      console.log(`      - isLocked: ${video.isLocked}`);
      console.log(`      - lockReason: ${video.lockReason}`);
      console.log(`      - isFreePreview: ${video.isFreePreview}`);
    });
    
    // Check if any videos are locked for a purchased user
    const lockedVideos = videosWithAccess.filter(v => v.isLocked);
    console.log(`\n⚠️  Locked videos for purchased user: ${lockedVideos.length}`);
    
    if (lockedVideos.length > 0) {
      console.log('❌ BUG FOUND: Purchased user has locked videos!');
      lockedVideos.forEach(video => {
        console.log(`   - "${video.title}" (${video.lockReason})`);
      });
    } else {
      console.log('✅ All videos accessible for purchased user');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testVideoAccess();
