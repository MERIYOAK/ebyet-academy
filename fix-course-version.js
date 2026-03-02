const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ibyet-investing')
  .then(async () => {
    console.log('🔍 Connected to MongoDB');
    
    const Course = require('./server/models/Course');
    const courseId = '69790910eedf55c69b320094';
    
    try {
      // Get current course data
      const course = await Course.findById(courseId);
      console.log('\n📚 Current Course Data:');
      console.log('Title:', course.title?.en);
      console.log('Current Version:', course.currentVersion);
      console.log('Videos array length:', course.videos?.length || 0);
      
      // Check what versions exist for videos
      const Video = require('./server/models/Video');
      const videoVersions = await Video.distinct('courseVersion', { courseId: courseId });
      console.log('\n🎥 Video versions found:', videoVersions);
      
      // Count videos per version
      for (const version of videoVersions) {
        const count = await Video.countDocuments({ courseId: courseId, courseVersion: version });
        console.log(`  Version ${version}: ${count} videos`);
      }
      
      // Update course to version 40 (where videos actually exist)
      if (videoVersions.includes(40)) {
        console.log('\n🔧 Updating course currentVersion from', course.currentVersion, 'to 40...');
        course.currentVersion = 40;
        await course.save();
        console.log('✅ Course updated successfully!');
        
        // Verify the update
        const updatedCourse = await Course.findById(courseId);
        console.log('📊 New currentVersion:', updatedCourse.currentVersion);
      } else {
        console.log('\n❌ Version 40 not found in video versions');
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  })
  .catch(err => {
    console.error('❌ Database error:', err);
    process.exit(1);
  });
