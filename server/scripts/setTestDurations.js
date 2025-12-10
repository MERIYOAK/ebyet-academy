const mongoose = require('mongoose');
const Video = require('../models/Video');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const setTestDurations = async () => {
  try {
    console.log('🔍 Setting test durations for videos...');
    
    // Find all videos
    const videos = await Video.find({});
    
    console.log(`📊 Found ${videos.length} videos`);
    
    if (videos.length === 0) {
      console.log('❌ No videos found in database');
      return;
    }
    
    // Test durations to assign
    const testDurations = [
      '5:30',   // 5 minutes 30 seconds
      '12:45',  // 12 minutes 45 seconds
      '8:15',   // 8 minutes 15 seconds
      '15:20',  // 15 minutes 20 seconds
      '3:45',   // 3 minutes 45 seconds
      '22:10',  // 22 minutes 10 seconds
      '7:30',   // 7 minutes 30 seconds
      '18:55',  // 18 minutes 55 seconds
      '4:20',   // 4 minutes 20 seconds
      '25:15'   // 25 minutes 15 seconds
    ];
    
    let updatedCount = 0;
    
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const testDuration = testDurations[i % testDurations.length]; // Cycle through test durations
      
      try {
        console.log(`🎬 Updating video "${video.title}" with duration: ${testDuration}`);
        
        video.duration = testDuration;
        await video.save();
        
        console.log(`✅ Updated video: ${video.title} -> ${testDuration}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Error updating video "${video.title}":`, error.message);
      }
    }
    
    console.log(`\n🎉 Test duration update completed!`);
    console.log(`✅ Successfully updated: ${updatedCount} videos`);
    
  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
setTestDurations(); 