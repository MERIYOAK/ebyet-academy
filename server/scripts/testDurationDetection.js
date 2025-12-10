const { getVideoMetadata, getVideoDuration } = require('../utils/videoDurationDetector');
const fs = require('fs');
const path = require('path');

const testDurationDetection = async (videoFilePath) => {
  try {
    console.log('🧪 Testing duration detection...');
    console.log(`📁 Video file: ${videoFilePath}`);
    
    if (!fs.existsSync(videoFilePath)) {
      console.error('❌ Video file not found!');
      return;
    }
    
    // Create a mock file object
    const mockFile = {
      path: videoFilePath,
      originalname: path.basename(videoFilePath),
      mimetype: 'video/mp4',
      size: fs.statSync(videoFilePath).size
    };
    
    console.log(`📊 File size: ${mockFile.size} bytes`);
    
    // Test getVideoDuration function
    console.log('\n🔍 Testing getVideoDuration function:');
    try {
      const duration = await getVideoDuration(mockFile);
      console.log(`✅ getVideoDuration result: ${duration} seconds`);
    } catch (error) {
      console.error(`❌ getVideoDuration error:`, error.message);
    }
    
    // Test getVideoMetadata function
    console.log('\n🔍 Testing getVideoMetadata function:');
    try {
      const metadata = await getVideoMetadata(mockFile);
      console.log(`✅ getVideoMetadata result:`);
      console.log(`   Duration: ${metadata.duration} seconds`);
      console.log(`   Formatted: ${metadata.durationFormatted}`);
      console.log(`   Resolution: ${metadata.width}x${metadata.height}`);
      console.log(`   Codec: ${metadata.videoCodec}/${metadata.audioCodec}`);
      console.log(`   FPS: ${metadata.fps}`);
    } catch (error) {
      console.error(`❌ getVideoMetadata error:`, error.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

// Get video file path from command line argument
const videoFilePath = process.argv[2];

if (!videoFilePath) {
  console.log('Usage: node testDurationDetection.js <path-to-video-file>');
  console.log('Example: node testDurationDetection.js ./test-video.mp4');
} else {
  testDurationDetection(videoFilePath);
} 