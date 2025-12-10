const mongoose = require('mongoose');
const Video = require('../models/Video');
const { getVideoMetadata, formatDuration } = require('../utils/videoDurationDetector');
const { getSignedUrlForFile } = require('../utils/s3CourseManager');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const downloadFile = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file async
      reject(err);
    });
  });
};

const updateVideoDurations = async () => {
  try {
    console.log('🔍 Starting video duration update process...');
    
    // Find all videos without duration or with '0:00' duration
    const videos = await Video.find({
      $or: [
        { duration: { $exists: false } },
        { duration: null },
        { duration: '' },
        { duration: '0:00' },
        { duration: '00:00' }
      ]
    });
    
    console.log(`📊 Found ${videos.length} videos that need duration updates`);
    
    if (videos.length === 0) {
      console.log('✅ All videos already have proper durations');
      return;
    }
    
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const video of videos) {
      try {
        console.log(`\n🎬 Processing video: "${video.title}" (ID: ${video._id})`);
        
        if (!video.s3Key) {
          console.log(`⚠️ No S3 key found for video: ${video.title}`);
          continue;
        }
        
        // Get signed URL for the video
        const videoUrl = await getSignedUrlForFile(video.s3Key, 3600); // 1 hour expiration
        if (!videoUrl) {
          console.log(`❌ Failed to get signed URL for video: ${video.title}`);
          continue;
        }
        
        // Download video to temp file
        const tempFilePath = path.join(tempDir, `${video._id}.mp4`);
        console.log(`📥 Downloading video to: ${tempFilePath}`);
        
        await downloadFile(videoUrl, tempFilePath);
        
        // Create a mock file object for ffmpeg analysis
        const mockFile = {
          path: tempFilePath,
          originalname: video.originalName || 'video.mp4',
          mimetype: video.mimeType || 'video/mp4'
        };
        
        // Get video metadata
        console.log(`🔍 Analyzing video metadata...`);
        const metadata = await getVideoMetadata(mockFile);
        
        if (metadata && metadata.duration) {
          const formattedDuration = formatDuration(metadata.duration);
          console.log(`⏱️ Detected duration: ${metadata.duration} seconds -> ${formattedDuration}`);
          
          // Update video in database
          video.duration = formattedDuration;
          video.width = metadata.width;
          video.height = metadata.height;
          video.fps = metadata.fps;
          video.videoCodec = metadata.videoCodec;
          video.audioCodec = metadata.audioCodec;
          video.bitrate = metadata.bitrate;
          
          await video.save();
          console.log(`✅ Updated video duration: ${formattedDuration}`);
          updatedCount++;
        } else {
          console.log(`⚠️ Could not detect duration for video: ${video.title}`);
          errorCount++;
        }
        
        // Clean up temp file
        fs.unlinkSync(tempFilePath);
        
      } catch (error) {
        console.error(`❌ Error processing video "${video.title}":`, error.message);
        errorCount++;
        
        // Clean up temp file if it exists
        const tempFilePath = path.join(tempDir, `${video._id}.mp4`);
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    }
    
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
    
    console.log(`\n🎉 Duration update completed!`);
    console.log(`✅ Successfully updated: ${updatedCount} videos`);
    console.log(`❌ Errors: ${errorCount} videos`);
    
  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
updateVideoDurations(); 