const mongoose = require('mongoose');
const Video = require('../models/Video');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const debugVideoDurations = async () => {
  try {
    console.log('🔍 Debugging video durations...');
    
    // Find all videos
    const videos = await Video.find({});
    
    console.log(`📊 Found ${videos.length} videos in database`);
    
    if (videos.length === 0) {
      console.log('❌ No videos found in database');
      return;
    }
    
    console.log('\n📋 Video Duration Analysis:');
    console.log('='.repeat(80));
    
    videos.forEach((video, index) => {
      console.log(`\n🎬 Video ${index + 1}: "${video.title}"`);
      console.log(`   Raw duration: ${video.duration} (type: ${typeof video.duration})`);
      
      if (typeof video.duration === 'number') {
        const minutes = Math.floor(video.duration / 60);
        const seconds = Math.floor(video.duration % 60);
        const calculatedDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        console.log(`   Calculated display: ${calculatedDisplay}`);
        console.log(`   Virtual formattedDuration: ${video.formattedDuration}`);
        
        // Check if duration is under one minute
        if (video.duration < 60) {
          console.log(`   ⚠️  Duration is under 1 minute (${video.duration} seconds)`);
        }
      } else if (typeof video.duration === 'string') {
        console.log(`   String duration: "${video.duration}"`);
      } else {
        console.log(`   ⚠️  Invalid duration type: ${typeof video.duration}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Debug complete');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the debug script
debugVideoDurations(); 