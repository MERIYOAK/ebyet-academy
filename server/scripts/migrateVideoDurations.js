const mongoose = require('mongoose');
const Video = require('../models/Video');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const parseDurationString = (durationString) => {
  if (!durationString || typeof durationString !== 'string') {
    return 0;
  }
  
  // Handle MM:SS format
  if (durationString.includes(':') && durationString.split(':').length === 2) {
    const [minutes, seconds] = durationString.split(':').map(Number);
    return (minutes * 60) + seconds;
  }
  
  // Handle HH:MM:SS format
  if (durationString.includes(':') && durationString.split(':').length === 3) {
    const [hours, minutes, seconds] = durationString.split(':').map(Number);
    return (hours * 3600) + (minutes * 60) + seconds;
  }
  
  // Handle just seconds
  const seconds = parseInt(durationString);
  return isNaN(seconds) ? 0 : seconds;
};

const migrateVideoDurations = async () => {
  try {
    console.log('🔍 Starting video duration migration...');
    
    // Find all videos with string duration
    const videos = await Video.find({
      duration: { $type: 'string' }
    });
    
    console.log(`📊 Found ${videos.length} videos with string duration format`);
    
    if (videos.length === 0) {
      console.log('✅ No videos need migration');
      return;
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const video of videos) {
      try {
        const oldDuration = video.duration;
        const newDuration = parseDurationString(oldDuration);
        
        console.log(`🎬 Migrating video "${video.title}": "${oldDuration}" -> ${newDuration} seconds`);
        
        video.duration = newDuration;
        await video.save();
        
        console.log(`✅ Migrated: ${video.title}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating video "${video.title}":`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully migrated: ${migratedCount} videos`);
    console.log(`❌ Errors: ${errorCount} videos`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the migration
migrateVideoDurations(); 