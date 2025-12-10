const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy');

// Import models and utilities
const User = require('./models/User');
const Video = require('./models/Video');
const { getVideosWithAccess } = require('./utils/purchaseUtils');
const { getSignedUrlForFile } = require('./utils/s3CourseManager');

async function testVideoApiResponse() {
  try {
    console.log('🔧 Testing video API response...');
    
    const userId = '68a66a72abb59c388de0a9cf'; // The user who purchased the course
    const courseId = '68a616a61e7edf6233cc14e7'; // The course ID
    
    console.log(`Testing user: ${userId}`);
    console.log(`Testing course: ${courseId}`);
    
    // Get videos with access control (simulating the API endpoint)
    const videosWithAccess = await getVideosWithAccess(courseId, userId, false, 1);
    console.log(`\n📹 Found ${videosWithAccess.length} videos with access control`);
    
    // Simulate the video controller logic for generating presigned URLs
    const videosWithUrls = await Promise.all(videosWithAccess.map(async (video) => {
      const videoObj = { ...video };
      
      console.log(`\n🔧 Processing video "${video.title}":`);
      console.log(`   - hasAccess: ${video.hasAccess}`);
      console.log(`   - isLocked: ${video.isLocked}`);
      console.log(`   - lockReason: ${video.lockReason}`);
      console.log(`   - isFreePreview: ${video.isFreePreview}`);
      console.log(`   - hasS3Key: ${!!video.s3Key}`);
      
      // Generate presigned URL if user has access to this video
      if (video.hasAccess && video.s3Key) {
        try {
          console.log(`   🔗 Generating presigned URL for "${video.title}"...`);
          const presignedUrl = await getSignedUrlForFile(video.s3Key);
          videoObj.videoUrl = presignedUrl;
          console.log(`   ✅ Successfully generated URL for "${video.title}"`);
          console.log(`   📏 URL length: ${presignedUrl.length}`);
        } catch (error) {
          console.error(`   ❌ Error getting presigned URL for video ${video._id}:`, error);
          videoObj.videoUrl = null;
        }
      } else {
        console.log(`   ⚠️ Skipping URL generation for "${video.title}": hasAccess=${video.hasAccess}, hasS3Key=${!!video.s3Key}`);
        videoObj.videoUrl = null;
      }
      
      return videoObj;
    }));
    
    console.log(`\n📊 Final video summary:`);
    videosWithUrls.forEach((video, index) => {
      console.log(`   ${index + 1}. "${video.title}"`);
      console.log(`      - hasAccess: ${video.hasAccess}`);
      console.log(`      - isLocked: ${video.isLocked}`);
      console.log(`      - hasVideoUrl: ${!!video.videoUrl}`);
      console.log(`      - isFreePreview: ${video.isFreePreview}`);
    });
    
    // Check for any issues
    const videosWithoutUrls = videosWithUrls.filter(v => v.hasAccess && !v.videoUrl);
    if (videosWithoutUrls.length > 0) {
      console.log(`\n❌ BUG FOUND: ${videosWithoutUrls.length} videos have access but no URL!`);
      videosWithoutUrls.forEach(video => {
        console.log(`   - "${video.title}" (hasAccess: ${video.hasAccess}, hasS3Key: ${!!video.s3Key})`);
      });
    } else {
      console.log(`\n✅ All accessible videos have URLs`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testVideoApiResponse();
