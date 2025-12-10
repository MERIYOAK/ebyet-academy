const mongoose = require('mongoose');
const Video = require('../models/Video');
const Course = require('../models/Course');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const testDurationDisplay = async () => {
  try {
    console.log('🧪 Testing duration display scenarios...');
    
    // First, check if we have any courses
    const courses = await Course.find({});
    if (courses.length === 0) {
      console.log('❌ No courses found. Please create a course first.');
      return;
    }
    
    const courseId = courses[0]._id;
    console.log(`📚 Using course: "${courses[0].title}" (ID: ${courseId})`);
    
    // Test durations (in seconds) - including durations under one minute
    const testDurations = [
      30,    // 0:30 (30 seconds)
      45,    // 0:45 (45 seconds)
      90,    // 1:30 (1 minute 30 seconds)
      125,   // 2:05 (2 minutes 5 seconds)
      180,   // 3:00 (3 minutes)
      245,   // 4:05 (4 minutes 5 seconds)
      3600,  // 1:00:00 (1 hour)
      3665   // 1:01:05 (1 hour 1 minute 5 seconds)
    ];
    
    // Create test videos with different durations
    const testVideos = [];
    for (let i = 0; i < testDurations.length; i++) {
      const duration = testDurations[i];
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const hours = Math.floor(duration / 3600);
      
      let expectedDisplay;
      if (hours > 0) {
        expectedDisplay = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        expectedDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      
      const video = new Video({
        title: `Test Video ${i + 1} (${expectedDisplay})`,
        s3Key: `test-video-${i + 1}.mp4`,
        courseId: courseId,
        courseVersion: 1,
        duration: duration, // Store as seconds
        order: i + 1,
        uploadedBy: 'test-script',
        status: 'active',
        processingStatus: 'completed'
      });
      
      testVideos.push(video);
    }
    
    // Save all test videos
    console.log('\n📝 Creating test videos...');
    for (const video of testVideos) {
      await video.save();
      console.log(`✅ Created: "${video.title}" with duration ${video.duration} seconds`);
    }
    
    // Test the display logic
    console.log('\n🔍 Testing duration display logic:');
    console.log('='.repeat(80));
    
    const savedVideos = await Video.find({ courseId }).sort({ order: 1 });
    
    savedVideos.forEach((video, index) => {
      console.log(`\n🎬 Video ${index + 1}: "${video.title}"`);
      console.log(`   Raw duration: ${video.duration} seconds`);
      console.log(`   Virtual formattedDuration: ${video.formattedDuration}`);
      
      // Test frontend calculation
      const minutes = Math.floor(video.duration / 60);
      const seconds = Math.floor(video.duration % 60);
      const frontendDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      console.log(`   Frontend calculation: ${frontendDisplay}`);
      
      // Check if durations under one minute are handled correctly
      if (video.duration < 60) {
        console.log(`   ⚠️  Duration under 1 minute: ${video.duration} seconds`);
        console.log(`   Expected: 0:${video.duration.toString().padStart(2, '0')}`);
        console.log(`   Actual: ${frontendDisplay}`);
      }
    });
    
    // Test total duration calculation
    console.log('\n📊 Total Duration Calculation:');
    const totalSeconds = savedVideos.reduce((acc, video) => acc + video.duration, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = Math.floor(totalSeconds % 60);
    
    console.log(`   Total seconds: ${totalSeconds}`);
    if (totalHours > 0) {
      console.log(`   Total display: ${totalHours}h ${totalMinutes}m ${totalSecs}s`);
    } else if (totalMinutes > 0) {
      console.log(`   Total display: ${totalMinutes}m ${totalSecs}s`);
    } else {
      console.log(`   Total display: ${totalSecs}s`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🧪 Test complete! Check the frontend to see how these durations are displayed.');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the test
testDurationDisplay(); 